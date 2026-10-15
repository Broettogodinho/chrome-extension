"""Transformação: limpa e padroniza os registros brutos do SGS."""

from __future__ import annotations

import logging

import pandas as pd

from series import Serie

log = logging.getLogger(__name__)

COLUNAS = ["serie_codigo", "serie_nome", "unidade", "periodicidade", "data", "valor"]


def transform(registros: list[dict], serie: Serie) -> pd.DataFrame:
    """Converte a lista bruta em um DataFrame tipado, sem duplicatas e ordenado.

    - `data` vem como "dd/mm/aaaa" → date
    - `valor` vem como texto com ponto decimal → float
    - linhas com data ou valor inválido são descartadas (e contadas no log)
    - datas repetidas mantêm o último valor publicado
    """
    if not registros:
        return pd.DataFrame(columns=COLUNAS)

    df = pd.DataFrame(registros)
    faltando = {"data", "valor"} - set(df.columns)
    if faltando:
        raise ValueError(f"Resposta da série {serie.codigo} sem as colunas: {sorted(faltando)}")

    df["data"] = pd.to_datetime(df["data"], format="%d/%m/%Y", errors="coerce").dt.date
    df["valor"] = pd.to_numeric(df["valor"].astype(str).str.strip().str.replace(",", ".", regex=False), errors="coerce")

    invalidas = df["data"].isna() | df["valor"].isna()
    if invalidas.any():
        log.warning("Série %s: %s linha(s) inválida(s) descartada(s).", serie.codigo, int(invalidas.sum()))
    df = df.loc[~invalidas]

    df = df.drop_duplicates(subset="data", keep="last").sort_values("data")
    df = df.assign(
        serie_codigo=serie.codigo,
        serie_nome=serie.nome,
        unidade=serie.unidade,
        periodicidade=serie.periodicidade,
    )
    return df[COLUNAS].reset_index(drop=True)
