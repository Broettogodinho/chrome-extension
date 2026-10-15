"""Catálogo das séries do Banco Central (SGS) usadas pelo pipeline.

Para incluir uma nova série, basta adicionar uma entrada aqui. Os códigos
podem ser consultados em https://www3.bcb.gov.br/sgspub/.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Serie:
    codigo: int
    nome: str
    unidade: str
    periodicidade: str  # "diaria" ou "mensal"


SERIES = {
    "selic_meta": Serie(432, "Meta da taxa SELIC", "% a.a.", "diaria"),
    "ipca": Serie(433, "IPCA - variação mensal", "% a.m.", "mensal"),
    "dolar_ptax": Serie(1, "Dólar comercial (venda, PTAX)", "R$/US$", "diaria"),
}
