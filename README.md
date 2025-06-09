# 🚀 Assistente de Candidaturas: Extensão para Chrome e Pipeline de Dados

## ✨ Visão Geral do Projeto

Este projeto tem como objetivo principal otimizar o processo de candidatura a vagas, desenvolvendo uma extensão para o Google Chrome e um pipeline de dados robusto. A solução permite que usuários armazenem suas informações de currículo, automatizem o preenchimento de formulários em sites de vagas e realizem comparações financeiras detalhadas entre regimes de contratação (CLT vs. PJ).

A ideia é reduzir a burocracia e o tempo gasto em candidaturas, permitindo que os profissionais foquem no desenvolvimento de suas carreiras.

## 🌟 Funcionalidades Principais

### Extensão para Google Chrome:
* **Gerenciamento de Currículo:**
    * Cadastro e armazenamento de informações pessoais, experiências profissionais, formação acadêmica e habilidades (Soft & Hard Skills).
    * Opção de criar e editar uma carta de apresentação personalizada.
    * Visualização organizada e rápida das informações do currículo no pop-up da extensão.
    * Validação mínima dos campos para garantir a integridade dos dados.
* **Análise Financeira (CLT vs. PJ):**
    * Interface para entrada de dados relevantes para simulação (salário bruto, benefícios, custos PJ, bônus, 13º, férias, etc.).
    * Cálculo detalhado do salário líquido anual para regimes CLT e PJ.
    * Comparativo claro entre a viabilidade financeira de propostas CLT e PJ.
    * Persistência dos últimos inputs para os cálculos financeiros.
* **Automação de Preenchimento:**
    * Botão no pop-up para acionar o preenchimento automático de formulários na página ativa.
    * Identificação inteligente de campos comuns em formulários de candidatura (nome, email, telefone, experiência, etc.).
    * Preenchimento automático dos campos identificados com os dados do currículo do usuário.

### Pipeline de Dados (Python):
* **Extração de Dados:** Scripts para coletar informações de APIs abertas (ex: dados meteorológicos, criptomoedas - *exemplo de dados que podem ser utilizados para demonstrar o pipeline*).
* **Transformação de Dados:** Lógica para limpar, normalizar e preparar os dados extraídos.
* **Carregamento para Banco de Dados:** Conexão e carregamento dos dados transformados em um banco de dados PostgreSQL online.
## 🛠️ Tecnologias Utilizadas

### Extensão Chrome:
* **Frontend:** HTML, CSS, JavaScript (Vanilla JS)
* **Armazenamento Local:** `chrome.storage.local`

### Pipeline de Dados:
* **Linguagem:** Python
* **Bibliotecas (ex):** `requests`, `pandas`, `psycopg2-binary` (para PostgreSQL)
* **Banco de Dados Online:** PostgreSQL (hospedado em plataformas gratuitas como Supabase ou Railway)

## 📦 Estrutura do Projeto

├── chrome-extension/         # Pasta para a extensão do Google Chrome
│   ├── manifest.json
│   ├── icons/
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.css
│   │   └── popup.js
│   ├── background.js
│   ├── content.js
│   └── utils/
│       ├── formMapper.js
│       └── financialCalculator.js
|
├── data-pipeline/            # Pasta para scripts Python de ETL e interação com o DB
│   ├── requirements.txt
│   ├── extract_api_data.py
│   ├── transform_data.py
│   ├── load_to_db.py
│   └── db_schema.sql
|
├── .gitignore                # Ignora arquivos e pastas que não devem ir para o Git
├── README.md                 # Documentação principal do projeto
└── LICENSE                   # Arquivo de licença do projeto

## 🚀 Como Rodar e Testar a Extensão (Localmente)

1.  **Clone o Repositório:**
    ```bash
    git clone [https://github.com/Broettogodinho/chrome-extension.git](https://github.com/Broettogodinho/chrome-extension.git)
    cd chrome-extension # Navegue para a pasta da extensão
    ```
    *Obs: O comando 'cd chrome-extension' é necessário porque a raiz da sua extensão é a pasta 'chrome-extension' dentro do seu repositório principal.*

2.  **Carregue a Extensão no Chrome:**
    * Abra o Google Chrome e vá para `chrome://extensions/`.
    * Ative o **"Modo desenvolvedor"** (Developer mode) no canto superior direito.
    * Clique em **"Carregar extensão descompactada"** (Load unpacked).
    * Selecione a pasta `chrome-extension` (dentro da pasta `job-assistant-project` que você clonou).
    * A extensão será carregada e um ícone aparecerá na sua barra de ferramentas.

    ## 🤝 Contribuições

Este projeto está sendo desenvolvido por **Bruno Godinho** (`@Broettogodinho`) e **Vinicius Bueno Paiva** ('@').
Sugestões, issues e pull requests são bem-vindos!

## 📝 Licença

Este projeto está licenciado sob a [Licença MIT](LICENSE).