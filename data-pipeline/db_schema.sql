-- Esquema do pipeline de indicadores econômicos (PostgreSQL 13+).
-- Idempotente: pode ser executado várias vezes.

CREATE SCHEMA IF NOT EXISTS indicadores;

CREATE TABLE IF NOT EXISTS indicadores.serie (
    serie_codigo   INTEGER PRIMARY KEY,
    serie_nome     TEXT        NOT NULL,
    unidade        TEXT        NOT NULL,
    periodicidade  TEXT        NOT NULL CHECK (periodicidade IN ('diaria', 'mensal'))
);

CREATE TABLE IF NOT EXISTS indicadores.valor (
    serie_codigo   INTEGER       NOT NULL REFERENCES indicadores.serie (serie_codigo),
    data           DATE          NOT NULL,
    valor          NUMERIC(18,6) NOT NULL,
    carregado_em   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    PRIMARY KEY (serie_codigo, data)
);

CREATE TABLE IF NOT EXISTS indicadores.execucao (
    execucao_id    BIGSERIAL PRIMARY KEY,
    iniciado_em    TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalizado_em  TIMESTAMPTZ,
    status         TEXT        NOT NULL DEFAULT 'em_andamento',
    linhas         INTEGER     NOT NULL DEFAULT 0,
    detalhe        TEXT
);

-- Visão mensal pronta para BI: último valor do mês para séries diárias,
-- o próprio valor para séries mensais.
CREATE OR REPLACE VIEW indicadores.vw_mensal AS
SELECT DISTINCT ON (v.serie_codigo, date_trunc('month', v.data))
       s.serie_codigo,
       s.serie_nome,
       s.unidade,
       date_trunc('month', v.data)::date AS mes,
       v.valor
FROM indicadores.valor v
JOIN indicadores.serie s USING (serie_codigo)
ORDER BY v.serie_codigo, date_trunc('month', v.data), v.data DESC;
