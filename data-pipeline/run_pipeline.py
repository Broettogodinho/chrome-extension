"""Orquestra o ETL: extrai do Banco Central, transforma e carrega no PostgreSQL.

Exemplos:
    python run_pipeline.py --init-db                       # cria o esquema e carrega os últimos 365 dias
    python run_pipeline.py --inicio 2015-01-01             # carga histórica
    python run_pipeline.py --series ipca selic_meta        # só algumas séries
    python run_pipeline.py --dry-run                       # não grava no banco; salva CSV em output/

A conexão vem da variável DATABASE_URL (ou do arquivo .env nesta pasta), ex.:
    DATABASE_URL=postgresql://usuario:senha@host:5432/postgres?sslmode=require
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import date, timedelta
from pathlib import Path

import pandas as pd

from extract_api_data import extract_serie, save_raw
from series import SERIES
from transform_data import transform

HERE = Path(__file__).resolve().parent
log = logging.getLogger("pipeline")


def load_dotenv(path: Path = HERE / ".env") -> None:
    """Leitor mínimo de .env (CHAVE=valor), sem dependência extra. Não sobrescreve o ambiente."""
    if not path.exists():
        return
    for linha in path.read_text(encoding="utf-8").splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue
        chave, valor = linha.split("=", 1)
        os.environ.setdefault(chave.strip(), valor.strip().strip('"').strip("'"))


def parse_args(argv=None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="ETL de indicadores do Banco Central → PostgreSQL")
    parser.add_argument("--inicio", type=date.fromisoformat, default=date.today() - timedelta(days=365),
                        help="data inicial AAAA-MM-DD (padrão: hoje - 365 dias)")
    parser.add_argument("--fim", type=date.fromisoformat, default=date.today(),
                        help="data final AAAA-MM-DD (padrão: hoje)")
    parser.add_argument("--series", nargs="+", choices=sorted(SERIES), default=sorted(SERIES),
                        help="séries a processar (padrão: todas)")
    parser.add_argument("--init-db", action="store_true", help="cria/atualiza o esquema antes da carga")
    parser.add_argument("--dry-run", action="store_true", help="não acessa o banco; grava CSV em output/")
    parser.add_argument("--fixtures", type=Path,
                        help="lê JSONs brutos desta pasta em vez da API (<chave>.json), útil para testes offline")
    parser.add_argument("--save-raw", action="store_true", help="salva as respostas brutas em data/raw/")
    args = parser.parse_args(argv)
    if args.inicio > args.fim:
        parser.error("--inicio deve ser anterior a --fim")
    return args


def extract_all(args) -> pd.DataFrame:
    frames = []
    for chave in args.series:
        serie = SERIES[chave]
        if args.fixtures:
            registros = json.loads((args.fixtures / f"{chave}.json").read_text(encoding="utf-8"))
        else:
            registros = extract_serie(serie, args.inicio, args.fim)
            if args.save_raw:
                save_raw(registros, HERE / "data" / "raw" / f"{chave}_{args.inicio}_{args.fim}.json")
        frames.append(transform(registros, serie))
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


def main(argv=None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    load_dotenv()
    args = parse_args(argv)

    if args.dry_run:
        df = extract_all(args)
        destino = HERE / "output" / "indicadores.csv"
        destino.parent.mkdir(exist_ok=True)
        df.to_csv(destino, index=False)
        log.info("Dry-run: %s linhas salvas em %s", len(df), destino)
        return 0

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        log.error("Defina DATABASE_URL (veja .env.example) ou use --dry-run.")
        return 2

    from load_to_db import connect, finish_run, init_schema, load, start_run  # psycopg2 só é necessário aqui

    conn = connect(database_url)
    try:
        if args.init_db:
            init_schema(conn)
        execucao_id = start_run(conn)
        try:
            df = extract_all(args)
            linhas = load(conn, df)
        except Exception as exc:
            finish_run(conn, execucao_id, "erro", 0, str(exc)[:1000])
            raise
        finish_run(conn, execucao_id, "sucesso", linhas, f"séries: {', '.join(args.series)}")
        log.info("Execução %s concluída: %s linhas.", execucao_id, linhas)
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
