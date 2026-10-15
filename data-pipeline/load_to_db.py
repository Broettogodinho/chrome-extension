"""Carga: grava as séries transformadas no PostgreSQL com upsert."""

from __future__ import annotations

import logging
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

log = logging.getLogger(__name__)

SCHEMA_FILE = Path(__file__).with_name("db_schema.sql")

UPSERT_SERIE = """
INSERT INTO indicadores.serie (serie_codigo, serie_nome, unidade, periodicidade)
VALUES %s
ON CONFLICT (serie_codigo) DO UPDATE
SET serie_nome = EXCLUDED.serie_nome,
    unidade = EXCLUDED.unidade,
    periodicidade = EXCLUDED.periodicidade
"""

UPSERT_VALOR = """
INSERT INTO indicadores.valor (serie_codigo, data, valor)
VALUES %s
ON CONFLICT (serie_codigo, data) DO UPDATE
SET valor = EXCLUDED.valor,
    carregado_em = now()
WHERE indicadores.valor.valor IS DISTINCT FROM EXCLUDED.valor
"""


def connect(database_url: str):
    """Abre a conexão. Provedores como Supabase/Railway exigem SSL (sslmode=require na URL)."""
    return psycopg2.connect(database_url)


def init_schema(conn) -> None:
    with conn, conn.cursor() as cur:
        cur.execute(SCHEMA_FILE.read_text(encoding="utf-8"))
    log.info("Esquema 'indicadores' verificado/criado.")


def start_run(conn) -> int:
    with conn, conn.cursor() as cur:
        cur.execute("INSERT INTO indicadores.execucao DEFAULT VALUES RETURNING execucao_id")
        return cur.fetchone()[0]


def finish_run(conn, execucao_id: int, status: str, linhas: int, detalhe: str | None = None) -> None:
    with conn, conn.cursor() as cur:
        cur.execute(
            """UPDATE indicadores.execucao
               SET finalizado_em = now(), status = %s, linhas = %s, detalhe = %s
               WHERE execucao_id = %s""",
            (status, linhas, detalhe, execucao_id),
        )


def load(conn, df: pd.DataFrame) -> int:
    """Faz upsert do catálogo e dos valores. Retorna o número de linhas processadas."""
    if df.empty:
        return 0
    series = df[["serie_codigo", "serie_nome", "unidade", "periodicidade"]].drop_duplicates()
    valores = [(int(r.serie_codigo), r.data, float(r.valor)) for r in df.itertuples(index=False)]

    with conn, conn.cursor() as cur:  # uma transação por carga: tudo ou nada
        execute_values(cur, UPSERT_SERIE, [tuple(x) for x in series.itertuples(index=False)])
        execute_values(cur, UPSERT_VALOR, valores, page_size=1000)
    log.info("%s linha(s) processadas (upsert).", len(valores))
    return len(valores)
