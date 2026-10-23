# Financial Products and Asset Allocation RAG Agent

[한국어 README](readme-kr.md)

This domain-specific RAG (Retrieval-Augmented Generation) service helps users study and explore financial products and asset allocation methods. It uses registered financial documents to explain the structure and risks of stocks, ETFs, bonds, and derivatives, and supports interactive exploration of portfolio theory, performance metrics, and asset allocation models.

## Purpose of this repository

This repository combines two learning tracks:

1. **Team infrastructure practice:** Move this RAG system from a personal computer or local environment to AWS EC2, learning AWS account setup, the AWS CLI, IAM, and EC2 operations along the way. This repository contains the application being migrated; the parallel infrastructure exercises are maintained in the `aws-ec2-alb-lab` repository.
2. **Essential finance for quants (about 40 hours):** Learn through RAG, four days of theory pages, and simulators:
   - **Financial products:** Stocks and ETFs, bonds, and derivatives, including their structures and investment strategies.
   - **Asset allocation methods:** Portfolio theory, performance analysis, risk metrics, mean-variance optimization, Black-Litterman, Risk Parity, and case studies.

This is an educational practice repository for building and operating RAG and backtesting applications while gaining finance knowledge and AWS operations experience. It is not a finished commercial service.

## Related AWS infrastructure repository

This application is developed alongside the `aws-ec2-alb-lab` repository, which covers AWS infrastructure learning and setup. `domain-rag-lab` manages the RAG and LEAN features and Docker configuration; `aws-ec2-alb-lab` covers deployment architecture and checks for EC2, VPC, security groups, ALB, ECS/ECR, and related AWS services.

The current single-instance EC2 deployment follows this repository's `docker-compose.prod.yml` and Caddy configuration. When expanding to ALB, high availability, ECS/Fargate, or EKS, review the network and deployment setup alongside the EC2, load balancer, and ECS exercises in `aws-ec2-alb-lab`. Do not share environment files, PEM keys, or AWS credentials between repositories or commit them to Git.

> This project is an example for financial education and analytical assistance. It does not recommend buying or selling any product or security. Investors are responsible for their own decisions.

## Core exercises

This repository has two main hands-on exercises:

1. **Build RAG with sources such as AI Hub:** Check the usage terms of financial and financial-law datasets, then clean, chunk, and add metadata to permitted source material for evidence-based question answering.
2. **Build a QuantConnect LEAN backtesting web app:** Connect yfinance daily prices to a remote LEAN Docker engine. Enter a security, test period, and comparison period, then inspect returns and maximum drawdown in a workflow UI.

For both exercises, record sources, licenses, and reference dates. Do not interpret backtest results as investment recommendations or legal advice.

## Topics covered

| Area | Main topics |
|---|---|
| Financial products | Stocks, ETFs, mutual funds, bonds, derivatives, dividends, and classification of financial investment products |
| Product comparison | Expense ratios, fees, spreads, liquidity, tracking error, premiums and discounts, and account-specific considerations |
| Portfolio theory | Diversification, correlation, efficient frontier, expected returns, and covariance |
| Performance and risk | CAGR, volatility, MDD, Sharpe ratio, and Sortino ratio |
| Asset allocation | Mean-variance optimization, Black-Litterman, Risk Parity, and cases such as 60/40 and All Weather |
| Investment analysis basics | Financial statements, valuation, macroeconomics, industry analysis, and technical analysis |

## Main features

- **Hybrid financial document search:** Combines Qdrant vector search and PostgreSQL keyword search using reciprocal rank fusion (RRF).
- **Educational response policy:** Prioritizes evidence from supplied documents and explains product structure, investment approaches, and risks instead of making definitive trading recommendations.
- **Multi-turn conversations:** Uses short-term session memory together with pgvector long-term memory.
- **Orchestrator:** Lets the LLM call document search, session history, and long-term memory tools as needed.
- **Document ingestion:** Upload TXT/PDF files or register text directly for chunking, embedding, and storage.
- **Streamlit UI:** Select a financial domain, chat, and compare standard RAG responses with tool-calling results.

## Architecture

```text
User / Streamlit UI
        │
        ▼
FastAPI
 ├─ POST /chat               Fixed RAG: search → answer
 ├─ POST /chat/orchestrate   Tool-calling orchestration
 └─ POST /ingest/*           Register financial documents
        │
        ├─ Qdrant       Financial document embeddings and similarity search
        ├─ PostgreSQL   Document chunks, conversation logs, long-term memory (pgvector)
        ├─ Redis        Cache infrastructure for future expansion
        └─ OpenAI-compatible LLM API (such as vLLM)
```

### Response flow

```text
Question
  → Apply financial-domain rules
  → Vector search + keyword search (merged with RRF)
  → Add session and long-term memory
  → Generate LLM answer
  → Return source documents and investment cautions
```

For `/chat/orchestrate`, the LLM can choose from these tools:

| Tool | Purpose |
|---|---|
| `search_documents` | Hybrid search across financial document chunks |
| `get_session_history` | Retrieve recent messages from the same session |
| `get_long_term_memory` | Retrieve semantically similar past conversations and memories |

## Quick start

### Environments

| Environment | Intended use | Compose file | Environment file | Exposure |
|---|---|---|---|---|
| Local | Development on your computer | `docker-compose.yml` | `.env.local` | API, Streamlit, database, and Qdrant ports available locally; code hot reload |
| Production | AWS EC2 deployment | `docker-compose.prod.yml` | `.env.prod` | Only ports 80/443 exposed through Caddy; data services stay on the internal network |

Local and AWS deployments use separate environment files, data volumes, and Compose project names. `.env.local`, `.env.prod`, and PEM keys are excluded from Git.

### 1. Prerequisites

- Docker and Docker Compose
- An LLM server with an OpenAI-compatible Chat Completions API, such as vLLM, LM Studio, or Ollama

`docker-compose.yml` is configured for local development. It starts PostgreSQL with pgvector, Redis, and Qdrant for this repository; no containers or external Docker networks from other projects are required.

| Service | Container/service name | Internal port |
|---|---|---:|
| PostgreSQL | `postgres` | 5432 |
| Redis | `redis` | 6379 |
| Qdrant | `qdrant` | 6333 |

[init.sql](init.sql) runs automatically when PostgreSQL initializes and enables the pgvector extension.

### 2. Run locally

Copy the local template and set your LLM address. Add AWS LEAN connection details if needed.

```bash
cp .env.local.example .env.local
# Edit .env.local
docker compose --env-file .env.local -f docker-compose.yml up --build -d
```

To use the orchestrator, your LLM server and model must support function/tool calling.

By default (`LEAN_RUNNER=local`), LEAN backtests run the `quantconnect/lean` container on the same computer through Docker. `docker-compose.yml` mounts `/var/run/docker.sock` into the API container. Temporary job files are created under `./data/lean-workflows` and then deleted. Running `docker pull quantconnect/lean:latest` beforehand helps prevent a timeout on the first backtest. Set `LEAN_RUNNER=off` to disable backtesting, or set `LEAN_RUNNER=remote` and configure SSH to use a remote server.

| Service | Address |
|---|---|
| Streamlit UI | http://localhost:8290 |
| FastAPI | http://localhost:8300 |
| API documentation | http://localhost:8300/docs |
| Health check | http://localhost:8300/health |
| Qdrant dashboard | http://localhost:6335/dashboard |
| PostgreSQL (host access) | `localhost:15433` |
| Redis (host access) | `localhost:6380` |

On the first run, API readiness can take some time while the embedding model initializes. Check it with:

```bash
docker compose --env-file .env.local -f docker-compose.yml ps
curl http://localhost:8300/health
```

To run only the UI locally, specify the API address:

```bash
pip install -r requirements.txt
API_BASE_URL=http://localhost:8300 streamlit run streamlit_app.py
```

### Four-day theory pages

The main screen's **4일 이론** (Four-day theory) menu provides the theory content. Each day's material is deployed with the main frontend's static assets; there are no separate theory HTML routes.

| Day | Learning path | Main topics |
|---|---|---|
| Day 1 | Financial products and contracts | Spot assets, futures, options, order matching, exchanges and clearinghouses, calls and puts, premiums and margins, expiration and settlement |
| Day 2 | Product comparison and trading structure | Funds, ETFs, REITs, ETNs, ETF underlying assets, derivative ETFs, futures and swaps in leveraged ETFs, daily reset, emerging markets, NAV/iNAV and premium or discount, short positions and securities lending, exchanges and clearinghouses, simulated Korean ETF portfolios and rebalancing |
| Day 3 | Interest rates and trading preparation | Bonds and interest rates, purposes and risks of derivatives, prerequisite education, simulated trading, and minimum deposits |
| Day 4 | Risk measurement and asset allocation | Futures and options sentiment and hedging; data, rules, and validation in quant investing; examples from Edward Thorp, James Simons, HMM, and Bamberger; variance, volatility, and option chains; margin, margin calls, and forced liquidation; positions and portfolios; All Weather portfolios, rebalancing, and market timing; MDD and Sharpe ratio |

Day 1 starts with the idea that a contract is created when an order to sell one futures contract matches an order to buy one. Unlike buying equity in a company through spot shares, a futures contract is a standardized agreement whose gains and losses depend on changes in the underlying reference price. Day 2 extends this to exchanges, clearinghouses, anonymous counterparties, and the differences between hedging, speculation, and arbitrage.

### Learning by day

The main screen's Four-day theory menu organizes daily learning. Core concepts are static frontend assets. Every text learning document under `data` is assigned once to a topic on one of the Day 1–4 pages and displayed as **DATA original detailed learning material**. Updating a document therefore updates the source material shown on its assigned day.

### Educational futures and options simulator

The main frontend's **자산배분 실습** (Asset allocation practice) includes a futures and put-option hedging module.

- Enter a portfolio value, assumed index level, and number of short index-futures contracts.
- Set the portion of stock/ETF exposure protected by put options and the assumed premium.
- Examine separate gains and losses for the spot portfolio, futures, and puts under stock-market crash, rate-hike, and inflation scenarios.
- Learn to read strike prices, premiums, implied volatility (IV), and open interest (OI) in a sample call and put option chain.

The numbers in this module and the option-chain table are educational assumptions. They do not reflect live prices or quotes, actual option prices, expirations, margins, fees, taxes, or product-specific trading restrictions. They are not trading signals or investment recommendations.

### EDA and LightGBM test simulation

Open the main screen's **EDA · LightGBM** menu at `/?view=quant`. The default dataset contains 620 trading days of reproducible synthetic OHLCV data. Choosing **삼성전자 최근 2년 일봉** (Samsung Electronics daily prices for the last two years) downloads daily OHLCV for Yahoo Finance symbol `005930.KS` through yfinance and uses it for the same analysis and model test. Duplicate requests are cached for 30 minutes. The app uses the regular `Close` price instead of the dividend-adjusted `Adj Close` and makes no additional price adjustments. It drops source rows with invalid open, high, low, or close ranges and displays the count. See the [Yahoo Finance symbol page](https://finance.yahoo.com/quote/005930.KS/) and [yfinance history documentation](https://ranaroussi.github.io/yfinance/reference/api/yfinance.Ticker.history.html).

You can also select stored daily prices by symbol from PostgreSQL or upload a UTF-8 CSV with `date,open,high,low,close,volume` columns (up to 1 MB and at least 180 valid trading-day rows). Stored prices use the existing `/market/history` route. Uploaded files and analysis results are not saved.

EDA shows closing-price and volume trends, the distribution of daily returns, missing-value counts, volatility, and maximum drawdown. LightGBM uses 1-, 5-, and 20-day returns, distance from moving averages, volatility, high-low range, and volume ratios to classify **whether the next trading day's close exceeds its open**. Training and test data are separated chronologically, excluding one row at the boundary. The test screen compares accuracy with a majority-class baseline, feature importance, and the performance of a simulated strategy versus holding during every trading day. The configured one-way trading cost is applied at each intraday entry and exit.

Start with the defaults. EDA is the step of reading data—for example, interpreting a move from yesterday's close of KRW 100 to today's close of KRW 103 as a 3% daily gain. [LightGBM is an open-source machine-learning library developed and released by Microsoft](https://www.microsoft.com/en-us/research/project/lightgbm/). Here, it uses past price and volume data to predict whether a stock will rise during the next trading day. If the next day's open is KRW 100 and close is KRW 103, the correct label is “up.” The displayed accuracy is the share of such labels the model predicts correctly.

Synthetic data is not actual market data. CSV results are also educational experiments on historical periods; they do not account for dividends, taxes, slippage, or failed fills.

### Walk-forward validation simulation

Open **Walk-Forward 검증** (Walk-forward validation) from the global navigation bar or visit the standalone `/walk-forward.html` page. The existing `/?view=walk-forward` URL also works. Based on the attached Python example, the simulator generates 1,250 trading days of synthetic market data with a fixed seed. It uses an expanding training window and purges the 10 trading days immediately before each test period. Defaults are four folds, a 10-day purge, and seed 42. You can change them to compare each fold's date range, ROC-AUC, recall, precision, F1, and daily results for actual risk versus model alerts. The API is `GET /walk-forward/simulate`.

The last 10 rows of the original example are removed because their future 10-day labels cannot be computed. The “bottom 10% risk” threshold is calculated **only from each fold's training data**, so the test distribution cannot leak into training. Synthetic inputs are independent random values; this dataset is designed to demonstrate validation procedure, not high predictive power.

### Historical data charts in the stock view

The company magazine modal that opens when you click a stock at `?view=stocks` has a **과거 데이터 보기** (View historical data) button. It is enabled only when that stock has daily OHLCV rows in PostgreSQL's `stock_price_history` table. Clicking it shows a candlestick chart and volume, a 1-month/3-month/6-month/all-time range selector, and hover tooltips. The `/market/history` API reads stored data only; it does not query Yahoo Finance directly. Stocks without stored data keep the button disabled.

To populate or refresh `stock_price_history`, run the backfill script inside the API container. It reads the 200-stock atlas in `frontend/app.js`, downloads one year of daily prices from Yahoo Finance, and upserts them.

```bash
docker compose exec api python -m app.ops.backfill_ohlcv
```

### Period returns in Day 2 ETF exploration

In Day 2's **국내 주요 운용사 전체 ETF 탐색** (Explore all ETFs from major Korean asset managers), changing **수익률 기간** (Return period) from three months to one month, six months, one year, or a custom range makes the `/market/period-return` API calculate returns from `stock_price_history` instead of fetching Yahoo Finance data on every request. If the table lacks one year of data for an ETF, a **1년 전 가져오기** (Fetch one year) button appears. Clicking it calls `POST /market/period-return/extend` to download and store data for that ETF on demand, then queries again.

To prefill one year of prices for the entire ETF catalog, run this separate backfill script. It reads ETF symbols from `frontend/days/assets/etf-catalog.json`.

```bash
docker compose exec api python -m app.ops.backfill_etf_ohlcv
```

### 3. Run on AWS EC2 (production)

Run these commands on the AWS server. The production Compose configuration does not use source bind mounts or `--reload`, and it does not expose PostgreSQL, Redis, or Qdrant ports externally. Caddy forwards web traffic to the FastAPI frontend and API.

```bash
cp .env.prod.example .env.prod
# In .env.prod, set a strong PostgreSQL password, the LLM address, and the server-side PEM path
chmod 600 /home/ubuntu/.ssh/pr-test.pem
docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

### Caddy production proxy

Caddy is a web server and reverse proxy, not a Python module. In this project, it accepts external requests on ports 80/443 and forwards them to the FastAPI container (`api:8000`) on the internal Docker network.

```text
Browser → Caddy (HTTP/HTTPS, compression) → FastAPI (api:8000)
```

The current [Caddyfile](Caddyfile) defines a domain-based proxy as follows. If the domain's DNS points to the server and ports 80/443 are open, Caddy issues and renews HTTPS certificates automatically with its default configuration.

```caddy
pr.edumgt.co.kr {
    encode zstd gzip
    reverse_proxy api:8000
}
```

#### Caddy and Nginx

Both are capable web servers and reverse proxies. Nginx offers fine-grained control and a broad operational track record; Caddy emphasizes automatic HTTPS and concise configuration.

| Aspect | Caddy | Nginx |
| --- | --- | --- |
| Main approach | Automation and simple operations | Fine-grained control and broad production use |
| Implementation language | Go | C |
| HTTPS (SSL/TLS) | Automatic certificate issuance and renewal for configured domains | Certificates, renewal, and server configuration are commonly managed separately |
| Configuration | Short `Caddyfile` | Detailed `nginx.conf` and site-specific configuration |
| HTTP/3 | Supported with relatively simple setup | May require version, build, deployment, or module checks |
| Performance | High performance suitable for most web services | Widely proven for high traffic and complex proxy requirements |
| Ecosystem | Growing, with strong automation in built-in features | Long-established, with extensive documentation, modules, and operational examples |

This project uses Caddy to expose a single FastAPI service over HTTPS while reducing certificate-management work. For very high traffic, complex Layer 7 routing, or integration with an existing Nginx operations standard, Nginx may be worth evaluating.

Before production deployment:

- Allow inbound TCP 80/443 in the AWS security group only when public web access is needed. Do not open PostgreSQL (5432), Redis (6379), or Qdrant (6333/6334).
- Set DNS so the domain in the [Caddyfile](Caddyfile) points to the EC2 public IP or load balancer.
- To run the LEAN container on the same EC2 host, set `LEAN_SSH_HOST=host.docker.internal` in `.env.prod` so the API container can reach the host's SSH service and Docker. Use a private IP or private DNS only for a separate LEAN server. Keep the PEM file on the server and mount it read-only.
- Update the deployment with `docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d`.

## Prepare the financial knowledge base

Sample files are included under `data/samples/finance_*.txt`. To ingest the financial-product classification, ETF deep dive, portfolio theory, asset allocation, performance analysis, and financial-statement and valuation samples at once, run:

```bash
for f in ./data/samples/finance_*.txt; do
  curl -X POST http://localhost:8300/ingest/file \
    -F "file=@${f}" \
    -F "domain=finance"
done
```

TXT and PDF files are supported. You can also upload files or register text directly from the UI sidebar.

### QuantConnect LEAN backtesting workflow

The top-level **LEAN 백테스트** (LEAN backtest) menu accepts a security, backtest period, and comparison period; prepares yfinance daily prices; and calls a `quantconnect/lean:latest` container. Set the execution location with `LEAN_RUNNER`.

| `LEAN_RUNNER` | Behavior | Required configuration |
|---|---|---|
| `local` (local default) | The API container starts a LEAN container on the same host using the mounted `/var/run/docker.sock` | `LEAN_LOCAL_WORKDIR_HOST` (absolute host path to `./data/lean-workflows`; Compose sets it automatically from `PWD`) |
| `remote` | Uploads files over SSH and runs Docker on a remote server | `LEAN_SSH_HOST`, `LEAN_SSH_USER`, `LEAN_SSH_KEY_HOST_PATH`, `LEAN_SSH_KEY_PATH` |
| `auto` | Uses `remote` if SSH is configured; otherwise uses `local` if a Docker socket is available | One of the configurations above |
| `off` | Disables the backtest API | None |

On AWS, put the remote settings in `.env.prod` and use `LEAN_RUNNER=remote`. Do not add the PEM key to the repository; mount it read-only from an absolute host path.

Results are educational buy-and-hold examples. Data quality, dividends, taxes, fees, slippage, and actual execution require separate review.

### Key sample documents

| File | Example use |
|---|---|
| `finance_high_school_product_guide.txt` | Explains deposits, bonds, stocks, ETFs, funds, and derivatives at a high-school level |
| `finance_financial_products_classification.txt` | Classifies financial investment products and introduces stocks, ETFs, and funds |
| `finance_etf_deep_dive.txt` | Compares costs, liquidity, and tracking error of mutual funds and ETFs |
| `finance_portfolio_theory.txt` | Covers modern portfolio theory, the efficient frontier, CAGR, MDD, and the Sharpe ratio |
| `finance_asset_allocation.txt` | Covers mean-variance, Black-Litterman, Risk Parity, allocation cases, brokerage and HTS/MTS order structures, KRX/NXT consolidated quotes, and smart order routing (SOR) |
| `finance_stock_dividend_basics.txt` | Introduces stocks, dividends, and financial products |
| `finance_valuation_multiples.txt` | Introduces relative valuation using P/E, P/B, and related multiples |
| `finance_quantopian_intro.txt` | Covers Quantopian's historical role, open-source tools such as Zipline, differences from LEAN, and backtesting cautions |
| `finance_lending_sectors_guide.txt` | Explores the registration, rules, and protections for first- and second-tier financial institutions, registered lenders, and private loans |
| `finance_aihub_rag_case.txt` | Demonstrates cleaning, chunking, adding metadata to, and ingesting AI Hub financial and legal data for RAG |

## Usage examples

### Compare financial products

```bash
curl -X POST http://localhost:8300/chat \
  -H "Content-Type: application/json" \
  -d '{
    "question": "When comparing mutual funds and ETFs, which costs and liquidity factors should I check?",
    "domain": "finance",
    "session_id": "finance-study-001",
    "top_k": 4
  }'
```

### Ask about asset allocation

```bash
curl -X POST http://localhost:8300/chat/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Explain the difference between a 60/40 portfolio and Risk Parity in terms of risk contribution.",
    "domain": "finance",
    "session_id": "allocation-study-001"
  }'
```

### Register a document directly

```bash
curl -X POST http://localhost:8300/ingest/text \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "allocation-policy-v1",
    "title": "Draft asset allocation policy",
    "content": "Record investment goals, time horizon, acceptable loss range, and rebalancing rules.",
    "domain": "finance"
  }'
```

## API summary

| Method | Route | Description |
|---|---|---|
| `GET` | `/health` | Check service health |
| `POST` | `/ingest/text` | Register a text document |
| `POST` | `/ingest/file` | Upload and ingest a TXT/PDF document |
| `POST` | `/chat` | Query the fixed RAG pipeline |
| `POST` | `/chat/orchestrate` | Query with tool-calling orchestration |

Set `domain` to `finance`. The implementation also accepts `general`, `medical`, and `english`, but this repository's primary knowledge base and purpose are financial products and asset allocation.

## Streamlit UI

Streamlit is an open-source framework for building web interfaces quickly with Python, without writing HTML, CSS, or JavaScript directly. It is useful for presenting data analyses and AI or machine-learning models on a shareable web page.

### Features and uses

- **Python-based:** Build buttons, forms, tables, and charts using `import streamlit as st` and widget functions.
- **Rapid prototyping:** Build dashboards and AI demos without a separate frontend or complex API layer.
- **Automatic reruns:** The script reruns and refreshes the page when users change inputs or interact with widgets.
- **Widgets and visualizations:** Use text inputs, file uploads, checkboxes, select boxes, sliders, and libraries such as Matplotlib and Plotly.
- **Simple deployment:** Share an app from a GitHub repository through services such as Streamlit Community Cloud.

Common uses include CSV analysis dashboards, AI demos such as chatbots connected to the ChatGPT API or image generators, and service prototypes for gathering user feedback. Streamlit is an option when you want to build a web app or dashboard UI quickly in Python.

### This repository's UI

Select `금융·투자` (Finance and investing) as the domain in the UI to use:

- **Orchestrator chat:** Inspect calls to document-search and conversation-memory tools.
- **Result report:** See iteration counts, called tools, and previews of each tool's inputs and outputs.
- **Standard RAG chat:** Adjust Top-K and inspect retrieved reference documents.
- **Document registration:** Add TXT/PDF financial research, product descriptions, and asset allocation policies.

Example questions:

- “Why should I check an ETF's expense ratio, spread, and tracking error?”
- “What is the difference between volatility and MDD, and why look at the Sharpe ratio alongside them?”
- “Compare the inputs and limitations of mean-variance optimization and Black-Litterman.”
- “What are the pros and cons of threshold-based and time-based rebalancing rules?”

## Project structure

```text
.
├── app/
│   ├── api/routes/        # Chat, ingestion, and health APIs
│   ├── core/              # Environment configuration and DB connections
│   ├── models/            # Chat logs, document chunks, and long-term memory models
│   ├── services/          # RAG, search, embedding, and orchestration
│   └── main.py
├── data/
│   ├── samples/           # Sample financial-product and asset-allocation documents
│   └── uploads/           # Uploaded file storage
├── frontend/              # Main static frontend
├── streamlit_app.py       # Demo UI
├── docker-compose.yml
├── Dockerfile
├── init.sql               # Initialize the pgvector extension
└── requirements.txt
```

## Technology stack and open-source components

This list reflects the implementation, `requirements.txt`, and Docker Compose configuration. Names link to the corresponding projects' GitHub repositories. Embeddings use this repository's lightweight hash-based implementation, not an external `sentence-transformers` model.

| Category | Technologies | Purpose |
|---|---|---|
| Language and containers | [Python](https://github.com/python/cpython) 3.11 · [Docker](https://github.com/docker/docker-ce) · [Docker Compose](https://github.com/docker/compose) | Build API/UI images and configure local and production environments |
| API and UI | [FastAPI](https://github.com/fastapi/fastapi) · [Uvicorn](https://github.com/encode/uvicorn) · [Streamlit](https://github.com/streamlit/streamlit) | REST API, ASGI server, and demo UI |
| Data stores | [PostgreSQL](https://github.com/postgres/postgres) · [pgvector](https://github.com/pgvector/pgvector) · [Redis](https://github.com/redis/redis) · [Qdrant](https://github.com/qdrant/qdrant) | Documents and conversations, long-term memory vectors, cache, and document similarity search |
| Data access libraries | [SQLAlchemy](https://github.com/sqlalchemy/sqlalchemy) · [psycopg2](https://github.com/psycopg/psycopg2) · [pgvector-python](https://github.com/pgvector/pgvector-python) · [redis-py](https://github.com/redis/redis-py) · [qdrant-client](https://github.com/qdrant/qdrant-client) | Integrate PostgreSQL/pgvector, Redis, and Qdrant |
| API and input libraries | [Pydantic](https://github.com/pydantic/pydantic) · [pydantic-settings](https://github.com/pydantic/pydantic-settings) · [HTTPX](https://github.com/encode/httpx) · [Requests](https://github.com/psf/requests) · [python-multipart](https://github.com/Kludex/python-multipart) · [pypdf](https://github.com/py-pdf/pypdf) | Validate settings and requests, call LLM/external APIs, upload files, and parse PDFs |
| LLM integration | [vLLM](https://github.com/vllm-project/vllm), [Ollama](https://github.com/ollama/ollama), or another OpenAI-compatible Chat Completions server | External LLM for RAG answers and tool calls; its address is supplied through environment variables |
| Financial backtesting and data | [QuantConnect LEAN](https://github.com/QuantConnect/Lean) · [yfinance](https://github.com/ranaroussi/yfinance) | Run Docker-based backtests and retrieve daily prices |
| Production proxy | [Caddy](https://github.com/caddyserver/caddy) | TLS termination and reverse proxy for FastAPI in production |

## Notes

- Response quality depends directly on the freshness, accuracy, and metadata of registered documents. Keep product descriptions, investment reports, and allocation policies current.
- The application does not automatically retrieve live prices, disclosures, or changes in tax law and regulations. For decisions requiring current information, check source documents and official disclosures separately.
- It does not automatically determine or guarantee products or weights suitable for a particular investor. Review investment goals, time horizon, risk tolerance, and liquidity needs separately.

## Appendix: Chunking and JSONL

This background section explains the relationship between the chunking performed internally by `POST /ingest/text` and `POST /ingest/file` and the JSONL format that can store or distribute chunks.

In building large language models, RAG systems, and AI fine-tuning pipelines, chunking prepares the data and JSONL provides a format for storing and loading it.

### 1. What each does

- **Chunking:** Splits a large document or dataset into smaller units a model can process. For example, a 100-page PDF might be divided into chunks of 500 tokens, roughly two or three paragraphs each.
- **JSONL (JSON Lines):** Stores one complete JSON object per line in a text file. Unlike a single large JSON document, it can be read line by line without loading the whole file into memory.

### 2. How chunking and JSONL relate

Chunks produced during preprocessing must be passed to a database or model-training pipeline. JSONL is a common, efficient format for storing and transferring them.

| Relationship or feature | Description |
| --- | --- |
| **One line per chunk** | Each chunk can become one JSONL line. |
| **Metadata packaging** | A line can hold the chunk's text together with its source, creation date, token count, embedding vector ID, and other metadata. |
| **Streaming at scale** | Even with millions of chunks, a pipeline can read one line at a time to ingest them into a vector database or pass them to a model. |

### 3. Example data structure (chunks for RAG or fine-tuning)

After chunking a document, the JSONL file could look like this:

```jsonl
{"chunk_id": "doc_001_01", "text": "A convertible bond (CB) combines characteristics of a bond and a stock.", "metadata": {"source": "finance-guide.pdf", "page": 12}}
{"chunk_id": "doc_001_02", "text": "When interest rates rise, existing bond prices generally fall; when rates fall, bond prices generally rise.", "metadata": {"source": "finance-guide.pdf", "page": 15}}
```

- **Chunking:** Divide a long financial document into meaningful pieces.
- **JSONL conversion:** Save each piece as a one-line JSON object with `chunk_id`, `text`, and `metadata` keys.

In short, chunking cuts the source into pieces, and JSONL is a convenient format for carrying those pieces. A typical RAG or LLM training flow is `source document → chunking → JSONL conversion → vector database or training pipeline`.

## KIS automated trading integration (three repositories)

This repository provides a **strategy specification API** (`/backtests/strategies`) for LEAN-validated strategies to `lumina-invest`.

- Progress and handoff: [todo.md](todo.md), especially Section 6, “Work report (AI agent handoff)”
- Cross-repository API contract: [docs/contracts/kis-autotrade-api.md](docs/contracts/kis-autotrade-api.md) (the same copy in all three repositories)
- Tests: `timeout 120 .venv/bin/python -m pytest -q`
