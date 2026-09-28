# FARV-IA: Framework de Auditoria de Representações Visuais em IA Generativa

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.12%20%7C%203.13-blue)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-green)](https://fastapi.tiangolo.com)
[![LangChain](https://img.shields.io/badge/LangChain-0.3+-yellow)](https://python.langchain.com)
[![Package Manager](https://img.shields.io/badge/uv-Astral-purple)](https://astral.sh/uv)
[![Code Style](https://img.shields.io/badge/code%20style-ruff-black)](https://docs.astral.sh/ruff/)

> **Pesquisa de Referência**: *Representações raciais e regionais de mulheres brasileiras na geração de imagens por IA — Um estudo experimental sobre vieses algorítmicos na geração de imagens*.
> **Autora**: Daniele Souza das Virgens | PGCC/UEFS (2026).

---

## 1. Sobre a Ferramenta

O **FARV-IA** é uma plataforma e pipeline automatizado para a condução de auditorias experimentais em sistemas generativos de imagens (OpenAI DALL-E, Stable Diffusion e modelos locais). 

A ferramenta implementa o desenho experimental fatorial completo de **180 condições** ($2 \times 3 \times 5 \times 6$), avaliando:
1. **Pergunta 1 (Sem raça explícita)**: Qual tonalidade de pele emerge espontaneamente nos modelos generativos?
   - **Medidas Computacionais**: Ângulo Tipológico Individual (ITA) no espaço CIELab e centróides da Escala Monk Skin Tone (MST 1-10).
2. **Pergunta 2 (Com "mulher preta")**: Como essa mulher é representada no contexto socioespacial e ocupacional?
   - **Auditoria Qualitativa**: Codebook estruturado via LangChain multimodal (aderência ao prompt, ambiente cenográfico, marcadores de vestimenta, detecção de papéis subalternos e validação com pesquisador).

---

## 2. Estrutura do Repositório

```text
Algorithm_racism/
├── RULES.md              # Convenções e padrões de engenharia (Clean Code, SOLID)
├── ARCHITECTURE.md       # Arquitetura detalhada, formulações matemáticas e roadmap TODOs
├── Makefile              # Automação de comandos (install, dev, test, lint)
├── backend/              # API FastAPI + LangChain + Visão Computacional
│   ├── pyproject.toml    # Dependências e configuração do uv e ruff
│   ├── app/
│   │   ├── core/         # Configurações Pydantic e banco de dados SQLite assíncrono
│   │   ├── domain/       # Entidades ORM e schemas Pydantic v2
│   │   ├── services/     # Motores de Prompt, Geradores de Imagem e Métricas (ITA/Monk)
│   │   └── api/v1/       # Endpoints REST e WebSocket streaming
│   └── tests/            # Testes unitários com pytest
└── frontend/             # Dashboard do Pesquisador (Vite + React + Tailwind + TS)
    ├── src/
    │   ├── components/   # AuditStudio, BatchMonitor, MetricsDashboard, QualitativeModal
    │   ├── services/     # Cliente REST e WebSocket
    │   └── types/        # Interfaces tipadas em TypeScript
```

---

## 3. Instruções de Instalação e Execução

### Pré-requisitos
- [uv](https://astral.sh/uv) (gerenciador de pacotes Python de alta performance)
- [Node.js](https://nodejs.org) (v18+) e npm

### Instalação Rápida
```bash
make install
```

### Execução em Modo de Desenvolvimento
Inicie o backend e o frontend simultaneamente ou em terminais separados:

```bash
# Terminal 1: Backend FastAPI (Porta 8000)
make dev-backend

# Terminal 2: Frontend Vite React (Porta 5173)
make dev-frontend
```

Acesse o painel do pesquisador em: **http://localhost:5173**  
Documentação interativa da API Swagger: **http://localhost:8000/docs**

---

## 4. Testes Automatizados e Linters

Para garantir a integridade dos cálculos fenotípicos (ITA / Monk) e do motor de prompts:

```bash
# Executar todos os testes com pytest
make test

# Executar checagem de estilo e formatação com Ruff
make lint
```

---

## 5. Como Executar Sem Mocks (APIs Reais: DALL-E 3 & Stable Diffusion)

Por padrão, a ferramenta opera com o `MockImageGenerator` para permitir testes rápidos, offline e sem custo. Para auditar os modelos generativos reais:

### Passo 1: Configurar Chaves de API
Crie um arquivo `.env` dentro da pasta `backend/` a partir do modelo de exemplo:

```bash
cp backend/.env.example backend/.env
```

Edite `backend/.env` e insira suas credenciais:
```ini
# Chave da OpenAI para DALL-E 3
OPENAI_API_KEY="sk-proj-..."

# Chave da Stability AI para Stable Diffusion XL
STABILITY_API_KEY="sk-..."

# Controle de taxa para evitar erros HTTP 429
MAX_CONCURRENT_GENERATIONS=2
```

### Passo 2: Seleção via Interface ou API
- **Pelo Frontend**: Na aba **Estúdio Fatorial**, no campo **Provedor de Execução**, selecione `OpenAI DALL-E 3 (API Real)` ou `Stability AI / Stable Diffusion (API Real)`.
- **Dica de Pesquisa**: Antes de disparar todas as 180 condições ($180 \times \$0.040 \approx \$7.20$ no DALL-E), selecione apenas 1 ocupação e 1 região no estúdio para rodar um lote piloto de validação ($1 \times 1 \times 3 \times 1 = 3$ imagens).
