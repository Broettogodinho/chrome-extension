# 🚀 Assistente de Candidaturas: Extensão para Chrome e Pipeline de Dados

[![testes](https://github.com/Broettogodinho/chrome-extension/actions/workflows/tests.yml/badge.svg)](https://github.com/Broettogodinho/chrome-extension/actions/workflows/tests.yml)

## ✨ Visão Geral

Este projeto tem duas partes:

1. **Extensão para Google Chrome.** Guarda seu currículo, preenche formulários de candidatura e compara propostas CLT × PJ.
2. **Pipeline de dados em Python.** ETL de indicadores econômicos do Banco Central (SELIC, IPCA e dólar) para um PostgreSQL online, com uma visão mensal pronta para BI.

A ideia é reduzir a burocracia das candidaturas e ajudar a decidir entre propostas com números, não com intuição.

## 🌟 Funcionalidades

### Extensão Chrome

**Currículo**
* Informações pessoais: nome, e-mail, telefone, endereço, cidade/UF, LinkedIn e portfólio.
* Experiências profissionais e formação acadêmica, com quantos blocos você quiser e a opção "atual / cursando".
* Hard e soft skills, com pré-visualização em etiquetas.
* Carta de apresentação com os marcadores `{empresa}` e `{cargo}`, preenchidos automaticamente a partir da página da vaga.
* Validação dos campos (e-mail, telefone com DDD, links http/https) e migração automática de dados salvos em versões anteriores.

**Autopreenchimento**
* O botão **"Preencher formulário desta página"** (ou o atalho **Alt+Shift+F**) preenche os campos reconhecidos da aba atual.
* O reconhecimento usa, nesta ordem:
  1. o atributo `autocomplete` do campo;
  2. o tipo do campo;
  3. `name`/`id`/`placeholder`, `aria-label` e o texto do rótulo, em português e inglês.
* Nunca sobrescreve o que você já digitou. Ignora senha, upload de arquivos e campos ambíguos ("nome da empresa", "nome de usuário", "estado civil"…).
* Funciona com formulários em React/Vue/Angular, que recebem os eventos `input`/`change`.
* Os campos preenchidos ficam destacados por alguns segundos.
* Privacidade: a extensão **não roda em nenhum site sozinha**. O script só é injetado quando você clica ou usa o atalho (permissão `activeTab`), e os dados ficam apenas no `chrome.storage.local` do seu navegador.

**Comparativo CLT × PJ**
* Tabelas de **2026**:
  * INSS: Portaria Interministerial MPS/MF nº 13/2026, teto R$ 8.475,55;
  * IRRF: inclui o **redutor da Lei 15.270/2025**, que zera o imposto até R$ 5.000/mês e reduz gradualmente até R$ 7.350;
  * dependentes e desconto simplificado.
* No CLT:
  * líquido mensal com VR/VA e plano de saúde;
  * 13º e 1/3 de férias tributados separadamente;
  * FGTS e estimativa da multa de 40%;
  * líquido anual com e sem FGTS.
* No PJ: impostos sobre faturamento, contador, plano de saúde e bônus.
* Mostra quem rende mais por ano, a diferença em R$ e %, e o **faturamento PJ necessário para empatar** com a proposta CLT.
* Os últimos valores digitados ficam salvos.

> ⚠️ Os cálculos são estimativas e não substituem um contador. As tabelas fiscais mudam todo ano; para atualizar, edite só as constantes no topo de `utils/financialCalculator.js`.

### Pipeline de dados (Python)
* **Extração** (`extract_api_data.py`):
  * API pública do Banco Central (SGS), sem chave;
  * divide o período em janelas de 10 anos, que é o limite da API para séries diárias;
  * faz até 3 tentativas com backoff.
* **Transformação** (`transform_data.py`):
  * tipagem de data e valor;
  * descarta linhas inválidas;
  * remove datas duplicadas, mantendo o último valor publicado.
* **Carga** (`load_to_db.py`):
  * upsert idempotente no PostgreSQL, em uma transação por carga;
  * log de cada execução na tabela `indicadores.execucao`.
* **Modelo** (`db_schema.sql`):
  * tabelas `indicadores.serie` e `indicadores.valor`;
  * visão `indicadores.vw_mensal`, pronta para Power BI ou outro BI.

## 🛠️ Tecnologias

* **Extensão:** HTML, CSS e JavaScript puro (Manifest V3), `chrome.storage.local`, `chrome.scripting`.
* **Pipeline:** Python 3.10+, `requests`, `pandas`, `psycopg2-binary`, PostgreSQL (Supabase, Railway ou outro).
* **Testes:** `node:test` (extensão) e `pytest` (pipeline), rodando no GitHub Actions.

## 📦 Estrutura

```
├── job-assistant-project/
│   ├── chrome-extension/          # pasta carregada no Chrome
│   │   ├── manifest.json
│   │   ├── background.js          # service worker: atalho de teclado
│   │   ├── content.js             # recebe o currículo e preenche a página
│   │   ├── icons/
│   │   ├── popup/                 # popup.html, popup.css, popup.js
│   │   └── utils/
│   │       ├── autofill.js        # injeta scripts na aba ativa
│   │       ├── financialCalculator.js
│   │       ├── formMapper.js      # reconhecimento e preenchimento de campos
│   │       └── storageManager.js  # persistência e migração do currículo
│   ├── tests/                     # testes da extensão (node --test)
│   └── package.json
│
├── data-pipeline/
│   ├── series.py                  # catálogo das séries do Banco Central
│   ├── extract_api_data.py
│   ├── transform_data.py
│   ├── load_to_db.py
│   ├── run_pipeline.py            # orquestrador (CLI)
│   ├── db_schema.sql
│   ├── requirements.txt
│   ├── .env.example
│   └── tests/
│
├── .github/workflows/tests.yml
├── README.md
└── LICENSE
```

## 🚀 Como usar a extensão

1. Clone o repositório:
   ```bash
   git clone https://github.com/Broettogodinho/chrome-extension.git
   ```
2. Abra `chrome://extensions/` e ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione a pasta `job-assistant-project/chrome-extension`.
4. Fixe o ícone na barra.
5. Preencha e salve seu currículo.
6. Abra a página de uma vaga e clique em **Preencher formulário desta página**, ou use **Alt+Shift+F**.

O atalho pode ser alterado em `chrome://extensions/shortcuts`. Para gerar um `.zip` para a Chrome Web Store, rode `npm run zip` dentro de `job-assistant-project/`.

**Testes da extensão** (Node 22+, sem dependências):
```bash
cd job-assistant-project
npm test
```

## 🐍 Como rodar o pipeline

```bash
cd data-pipeline
python -m venv venv
venv\Scripts\activate          # Windows  (Linux/macOS: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env         # e preencha DATABASE_URL  (Linux/macOS: cp)

python run_pipeline.py --init-db                 # cria o esquema e carrega os últimos 365 dias
python run_pipeline.py --inicio 2015-01-01       # carga histórica
python run_pipeline.py --series ipca selic_meta  # só algumas séries
python run_pipeline.py --dry-run                 # sem banco: gera output/indicadores.csv
```

A carga é idempotente: rodar de novo atualiza os valores alterados sem duplicar linhas. Para agendar, use o Agendador de Tarefas do Windows, `cron` ou um workflow agendado do GitHub Actions com `DATABASE_URL` como *secret*.

**Testes do pipeline:**
```bash
pytest -q                                   # unitários (offline)
PG_TEST_URL=postgresql://... pytest -q      # inclui a carga num PostgreSQL de teste
```

## 🤝 Contribuições

Projeto desenvolvido por **Bruno Godinho** (`@Broettogodinho`) e **Vinicius Bueno Paiva**. Sugestões, issues e pull requests são bem-vindos!

## 📝 Licença

Licenciado sob a [Licença MIT](LICENSE).
