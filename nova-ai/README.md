# NOVA AI — ChatGPT-like Production Workspace

NOVA AI is a complete, full-stack, production-ready AI chatbot workspace similar to ChatGPT. It features user authentication, persistent chat conversations, dynamic models configuration, document uploads, and a local RAG vector retrieval pipeline.

## Features

- 🔐 **Secure Auth**: JWT token authentication with bcrypt password encryption.
- 💬 **ChatGPT UI**: Premium dashboard with sidebar search, responsive sidebar menus, suggested queries, and code blocks.
- ⚡ **Realtime Streaming**: SSE token-by-token completions with a "Stop generation" button.
- 🗂️ **Context Memory**: Intelligently compiles past messages to maintain continuous context.
- 📂 **Multi-format RAG**: Upload PDF, DOCX, TXT, and Markdown files to index them for question-answering.
- 📌 **Citations**: Renders interactive cards pointing to sources utilized in generating an answer.
- 🤖 **Interchangeable AI Layers**: Supports local LLMs via Ollama or any cloud endpoint conforming to the OpenAI spec.

---

## Architecture Monorepo Layout

```
nova-ai/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # Routers (auth, chat, files, settings)
│   │   ├── core/             # Configuration & security
│   │   ├── db/               # Async database connection & sessions
│   │   ├── models/           # SQLAlchemy DB schemas
│   │   ├── schemas/          # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── ai/           # Ollama / OpenAI providers
│   │   │   └── rag/          # Text extraction & vector calculations
│   │   └── main.py           # Entrypoint app
│   ├── tests/                # Async pytest test files
│   ├── requirements.txt      # Backend Python dependencies
│   ├── Dockerfile
│   └── .env.example
├── frontend/                 # React Vite Client
│   ├── src/
│   │   ├── components/       # Sidebar, ChatComposer, MessageItem, SettingsModal
│   │   ├── stores/           # Zustand state management (auth, chat)
│   │   ├── types/            # TypeScript interfaces
│   │   ├── App.tsx           # Layout driver
│   │   ├── main.tsx          # Mount point
│   │   └── index.css         # Styling, codeblocks, scrollbars
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── nginx.conf            # Serving static assets and proxies
│   └── Dockerfile
└── docker-compose.yml        # Multi-container local execution orchestrator
```

---

## Requirements

Ensure you have the following installed:
- **Python**: 3.10 or higher
- **NodeJS**: v18 or higher (with `npm`)
- **Docker & Docker Compose** (Optional, for container setup)
- **Ollama** (Optional, for running LLMs offline)

---

## Installation & Local Startup

### 1. Model Provider Setup (Ollama)

1. Download and install [Ollama](https://ollama.com).
2. Start Ollama and download a chat LLM:
   ```bash
   ollama pull llama3
   ```

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the environment template:
   ```bash
   copy .env.example .env   # Windows
   cp .env.example .env     # Linux/macOS
   ```
5. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Note: On launch, database tables will be automatically initialized inside a local sqlite database `nova_ai.db` in the backend folder.*

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Launch the Vite dev server:
   ```bash
   npm run dev
   ```
4. Open your browser to the local workspace port:
   `http://localhost:3000`

---

## Docker Compose Quickstart

To run the complete application stack (PostgreSQL DB + FastAPI backend + React Vite client) automatically inside container nodes:

1. In the root `nova-ai` folder, run:
   ```bash
   docker-compose up --build
   ```
2. Access the frontend app at `http://localhost:3000`. The API requests are proxied internally to port `8000`.
3. To connect to an Ollama daemon running on your host machine from inside the docker container, verify that your backend configuration has:
   ```env
   OLLAMA_BASE_URL="http://host.docker.internal:11434"
   ```

---

## Backend Test Suite

To run the test suite verifying registration, settings updating, and mock SSE chat completions:

1. Navigate to `backend` and activate the virtual environment.
2. Run pytest:
   ```bash
   pytest
   ```
