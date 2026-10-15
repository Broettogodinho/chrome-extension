"""Extração: busca as séries na API pública do Banco Central (SGS).

Endpoint: https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados
A API limita consultas de séries diárias a janelas de até 10 anos, por isso
o período é dividido em blocos.
"""

from __future__ import annotations

import json
import logging
import time
from datetime import date, timedelta
from pathlib import Path

import requests

from series import Serie

log = logging.getLogger(__name__)

BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados"
MAX_WINDOW_DAYS = 3650  # ~10 anos
TIMEOUT_SECONDS = 30
MAX_RETRIES = 3


def _windows(inicio: date, fim: date, max_days: int = MAX_WINDOW_DAYS):
    """Divide [inicio, fim] em janelas consecutivas de no máximo `max_days`."""
    atual = inicio
    while atual <= fim:
        limite = min(fim, atual + timedelta(days=max_days - 1))
        yield atual, limite
        atual = limite + timedelta(days=1)


def _get_with_retry(session: requests.Session, url: str, params: dict) -> list[dict]:
    for tentativa in range(1, MAX_RETRIES + 1):
        try:
            resp = session.get(url, params=params, timeout=TIMEOUT_SECONDS)
            if resp.status_code == 404:
                return []  # sem dados no período
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, ValueError) as exc:
            if tentativa == MAX_RETRIES:
                raise RuntimeError(f"Falha ao consultar {url}: {exc}") from exc
            espera = 2 ** tentativa
            log.warning("Tentativa %s falhou (%s). Nova tentativa em %ss.", tentativa, exc, espera)
            time.sleep(espera)
    return []


def extract_serie(serie: Serie, inicio: date, fim: date, session: requests.Session | None = None) -> list[dict]:
    """Retorna os registros brutos da série: [{"data": "dd/mm/aaaa", "valor": "1.23"}, ...]."""
    session = session or requests.Session()
    url = BASE_URL.format(codigo=serie.codigo)
    registros: list[dict] = []
    for ini, fim_janela in _windows(inicio, fim):
        params = {
            "formato": "json",
            "dataInicial": ini.strftime("%d/%m/%Y"),
            "dataFinal": fim_janela.strftime("%d/%m/%Y"),
        }
        registros.extend(_get_with_retry(session, url, params))
    log.info("Série %s (%s): %s registros extraídos.", serie.codigo, serie.nome, len(registros))
    return registros


def save_raw(registros: list[dict], destino: Path) -> Path:
    """Guarda a resposta bruta (útil para auditoria e reprocessamento)."""
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(json.dumps(registros, ensure_ascii=False, indent=1), encoding="utf-8")
    return destino
