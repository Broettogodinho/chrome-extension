# CLAUDE.md: Assistente de Candidaturas

Duas partes independentes; veja o `README.md`:
- `job-assistant-project/chrome-extension/`: extensão Chrome (Manifest V3, JavaScript puro): currículo, autopreenchimento de formulários de vagas e comparativo CLT × PJ.
- `data-pipeline/`: ETL em Python de indicadores do Banco Central (SELIC, IPCA, dólar) → PostgreSQL.

## Comandos

- Testes da extensão: `cd job-assistant-project` → `npm test` (Node 22+, sem dependências)
- Carregar a extensão: `chrome://extensions` → Modo do desenvolvedor → Carregar sem compactação → `job-assistant-project/chrome-extension`
- Pacote para a Chrome Web Store: `npm run zip` em `job-assistant-project/`
- Pipeline: `cd data-pipeline`, ative `.venv\Scripts\activate`, depois `python -m pytest -q` e `python run_pipeline.py --dry-run`

## Regras

- **Tabelas fiscais** (INSS, IRRF, redutor da Lei 15.270/2025) ficam só nas constantes no topo de `utils/financialCalculator.js`. Ao atualizar o ano, confira a fonte oficial e ajuste os testes em `tests/financialCalculator.test.mjs`.
- **Permissões da extensão:** nada de `host_permissions` amplas nem content script automático. A injeção é sob demanda via `activeTab` + `scripting` (botão ou Alt+Shift+F).
- **Segurança:** dados do usuário nunca entram em `innerHTML`; monte o DOM com `textContent`/`createElement`.
- **Reconhecimento de campos** (`utils/formMapper.js`): toda regra nova vem com caso em `tests/formMapper.test.mjs`, incluindo um caso de falso positivo.
- **Nunca versionar:** `.env` (tem o `DATABASE_URL`), `.venv/`, `node_modules/`, `*.zip`.
- Os testes (`npm test` e `pytest`) precisam passar antes de commitar.

## Fluxo de trabalho

- Branch por mudança e PR para `main`; não fazer push direto na `main`.
- Código, commits e documentação em português.
