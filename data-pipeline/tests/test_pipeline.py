"""Testes do pipeline. Os testes de banco rodam só se PG_TEST_URL estiver definida."""

import os
import sys
from datetime import date
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from extract_api_data import _windows, extract_serie  # noqa: E402
from run_pipeline import main  # noqa: E402
from series import SERIES  # noqa: E402
from transform_data import transform  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"


def test_transform_tipa_deduplica_e_descarta_invalidos():
    registros = [
        {"data": "30/09/2026", "valor": "5.3348"},
        {"data": "30/09/2026", "valor": "5.3350"},  # republicação: vale a última
        {"data": "01/10/2026", "valor": ""},        # valor vazio
        {"data": "31/02/2026", "valor": "5.40"},    # data inexistente
        {"data": "29/09/2026", "valor": "5,3120"},  # vírgula decimal
    ]
    df = transform(registros, SERIES["dolar_ptax"])
    assert list(df["data"]) == [date(2026, 9, 29), date(2026, 9, 30)]
    assert list(df["valor"]) == [5.312, 5.335]
    assert set(df["serie_codigo"]) == {1}


def test_transform_vazio_e_colunas_ausentes():
    assert transform([], SERIES["ipca"]).empty
    with pytest.raises(ValueError):
        transform([{"x": 1}], SERIES["ipca"])


def test_windows_respeita_limite_de_10_anos():
    janelas = list(_windows(date(2000, 1, 1), date(2026, 10, 15)))
    assert janelas[0][0] == date(2000, 1, 1) and janelas[-1][1] == date(2026, 10, 15)
    assert all((fim - ini).days < 3650 for ini, fim in janelas)
    assert all(janelas[i][1].toordinal() + 1 == janelas[i + 1][0].toordinal() for i in range(len(janelas) - 1))


class FakeResponse:
    def __init__(self, payload, status=200):
        self.payload, self.status_code = payload, status

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError(self.status_code)

    def json(self):
        return self.payload


class FakeSession:
    def __init__(self):
        self.calls = []

    def get(self, url, params, timeout):
        self.calls.append((url, params))
        return FakeResponse([{"data": params["dataInicial"], "valor": "1.0"}])


def test_extract_monta_url_e_pagina_por_janela():
    session = FakeSession()
    registros = extract_serie(SERIES["selic_meta"], date(2010, 1, 1), date(2026, 1, 1), session=session)
    assert len(session.calls) == 2 and len(registros) == 2
    assert session.calls[0][0].endswith("bcdata.sgs.432/dados")
    assert session.calls[0][1]["dataInicial"] == "01/01/2010"


def test_dry_run_com_fixtures(tmp_path, monkeypatch):
    assert main(["--dry-run", "--fixtures", str(FIXTURES)]) == 0
    csv = Path(__file__).resolve().parents[1] / "output" / "indicadores.csv"
    linhas = csv.read_text(encoding="utf-8").strip().splitlines()
    assert len(linhas) == 1 + 5 + 3 + 3  # cabeçalho + selic + ipca + dólar (válidos e únicos)


@pytest.mark.skipif(not os.environ.get("PG_TEST_URL"), reason="defina PG_TEST_URL para testar a carga")
def test_carga_idempotente_no_postgres(monkeypatch):
    import psycopg2

    monkeypatch.setenv("DATABASE_URL", os.environ["PG_TEST_URL"])
    args = ["--init-db", "--fixtures", str(FIXTURES)]
    assert main(args) == 0
    assert main(args) == 0  # segunda carga não duplica

    with psycopg2.connect(os.environ["PG_TEST_URL"]) as conn, conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM indicadores.valor")
        assert cur.fetchone()[0] == 11
        cur.execute("SELECT valor FROM indicadores.vw_mensal WHERE serie_codigo = 432 AND mes = '2026-09-01'")
        assert float(cur.fetchone()[0]) == 14.75
        cur.execute("SELECT count(*), bool_and(status = 'sucesso') FROM indicadores.execucao")
        assert cur.fetchone()[1] is True
