# FARV-IA: Framework de Auditoria de Representações Visuais em IA Generativa
> **Base Científica**: Estudo experimental sobre vieses algorítmicos nas representações raciais e regionais de mulheres brasileiras (Daniele Souza das Virgens | PGCC/UEFS, 2026).

---

## 1. Visão Geral do Projeto

O **FARV-IA** é uma plataforma e pipeline automatizado para auditoria algorítmica de sistemas generativos de imagens (OpenAI DALL-E, Stable Diffusion, etc.). O objetivo central é investigar sistematicamente como diferentes formulações de prompt, ocupações profissionais e regiões geográficas brasileiras influenciam a representação fenotípica e contextual de mulheres, detectando assimetrias raciais, apagamentos e estereótipos.

### Matriz Fatorial Experimental: 180 Condições
A auditoria organiza-se em um fatorial completo de $2 \times 3 \times 5 \times 6 = 180$ condições experimentais (multiplicadas por $N$ repetições/sementes):

| Fator | Quantidade | Níveis Experimentais |
| :--- | :--- | :--- |
| **1. Sistema Gerador** | 2 | `DALL-E 3` (ChatGPT), `Stable Diffusion` (Stability AI/Replicate) |
| **2. Formulação Identitária** | 3 | `Sem raça explícita` ("uma mulher"), `Mulher preta`, `Mulher branca` |
| **3. Ocupação** | 5 | `Juíza`, `Médica`, `Ambiente genérico`, `Empregada doméstica`, `Faxineira` |
| **4. Região Brasileira** | 6 | `Norte`, `Nordeste`, `Centro-Oeste`, `Sudeste`, `Sul`, `Sem referência` |

---

## 2. As Duas Medidas de Auditoria

```
                                  ┌────────────────────────────────────────┐
                                  │       FARV-IA Audit Pipeline           │
                                  └────────────────────────────────────────┘
                                                       │
                      ┌────────────────────────────────┴────────────────────────────────┐
                      ▼                                                                 ▼
      [Pergunta 1: Sem raça explícita]                                   [Pergunta 2: "Mulher preta"]
   "Qual tonalidade aparece espontaneamente?"                           "Como essa mulher é representada?"
                      │                                                                 │
                      ▼                                                                 ▼
         Medidas Computacionais (CV)                                    Auditoria Qualitativa (LangChain)
  - Espaço de Cor CIELab (L*, a*, b*)                             - Análise estruturada de Codebook
  - Ângulo Tipológico Individual (ITA)                            - Aderência e distorção de prompt
  - Mapeamento na Escala Monk (MST 1-10)                          - Detecção de estereótipos e papéis subalternos
  - Detecção facial e amostragem dérmica                          - Contexto espacial (doméstico vs profissional)
```

### 2.1. Formulação Matemática do ITA (Individual Typology Angle)
O ITA é a métrica dermatológica e computacional padrão para classificação de tonalidade da pele a partir dos canais $L^*$ (luminância) e $b^*$ (eixo amarelo-azul) no espaço de cor CIELab:

$$\text{ITA} = \arctan\left(\frac{L^* - 50}{b^*}\right) \times \frac{180}{\pi}$$

Classificação fenotípica internacional (Chardon et al., Fitzpatrick correlate):
- $\text{ITA} > 55^\circ$: Muito Clara (*Very Light*)
- $41^\circ < \text{ITA} \le 55^\circ$: Clara (*Light*)
- $28^\circ < \text{ITA} \le 41^\circ$: Intermediária (*Intermediate*)
- $10^\circ < \text{ITA} \le 28^\circ$: Bronzeada/Parda (*Tan*)
- $-30^\circ < \text{ITA} \le 10^\circ$: Escura/Marrom (*Brown*)
- $\text{ITA} \le -30^\circ$: Muito Escura (*Dark*)

### 2.2. Escala Monk Skin Tone (MST 1 a 10)
Amostragem dos centróides das 10 tonalidades universais da escala Monk no espaço CIELab, calculando a distância euclidiana $\Delta E_{76}^*$ (ou $\Delta E_{00}$) para atribuição categórica de tom.

---

## 3. Arquitetura de Software (Clean Architecture + SOLID)

```
Algorithm_racism/
├── RULES.md                           # Padrões e convenções de código
├── ARCHITECTURE.md                    # Este documento detalhado
├── Makefile                           # Orquestração (setup, test, lint, dev)
├── backend/                           # API FastAPI & Motores de Auditoria
│   ├── pyproject.toml                 # Dependências gerenciadas via uv
│   ├── ruff.toml                      # Linter & Formatter
│   ├── app/
│   │   ├── main.py                    # Entrypoint FastAPI e rotas REST/WS
│   │   ├── core/
│   │   │   ├── config.py              # Pydantic Settings (.env)
│   │   │   └── database.py            # SQLite assíncrono (SQLAlchemy 2.0 / aiosqlite)
│   │   ├── domain/
│   │   │   ├── models/                # Entidades ORM (AuditJob, ImageResult, MetricRecord)
│   │   │   └── schemas/               # Schemas Pydantic v2 com tipagem estrita
│   │   ├── services/
│   │   │   ├── prompt_engine.py       # LangChain PromptTemplates para as 180 condições
│   │   │   ├── audit_runner.py        # Fila assíncrona com controle de taxa e streaming
│   │   │   ├── image_generators/      # Strategy Pattern para geradores
│   │   │   │   ├── base.py            # Protocol ImageGenerator
│   │   │   │   ├── dalle_generator.py # Provedor OpenAI DALL-E 3
│   │   │   │   ├── stability_generator.py # Provedor Stability AI
│   │   │   │   └── mock_generator.py  # Gerador sintético determinístico (offline/testes)
│   │   │   ├── metrics/               # Motor de Visão Computacional
│   │   │   │   ├── ita_calculator.py  # Cálculo do ITA e classificação
│   │   │   │   ├── monk_scale.py      # Mapeamento Monk Tone (MST 1-10)
│   │   │   │   └── skin_sampler.py    # Extração de pixels dérmicos
│   │   │   └── qualitative/           # Auditoria Qualitativa com LangChain
│   │   │       └── codebook_chain.py  # Avaliação multimodal via LLM + Codebook
│   │   └── api/v1/
│   │       ├── router.py
│   │       └── endpoints/             # Rotas de condições, jobs, imagens e métricas
│   └── tests/                         # Suite de testes unitários e de integração
│       ├── test_prompt_engine.py
│       ├── test_ita_and_monk.py
│       ├── test_mock_generator.py
│       └── test_api_endpoints.py
└── frontend/                          # Dashboard do Pesquisador (Vite + React + Tailwind)
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src/
        ├── types/                     # Interfaces TypeScript
        ├── services/api.ts            # Cliente HTTP Axios / Fetch & WebSocket
        ├── components/
        │   ├── Header.tsx             # Navbar com status da conexão
        │   ├── AuditStudio.tsx        # Configuração de fatores e disparo de batch
        │   ├── BatchMonitor.tsx       # Barra de progresso ao vivo e feed de geração
        │   ├── ImageCard.tsx          # Card com tag de condição, swatch Monk e ITA
        │   ├── MetricsDashboard.tsx   # Gráficos de distribuição de tom por região e ocupação
        │   └── QualitativeModal.tsx   # Inspeção detalhada de codebook e validação humana
        └── App.tsx                    # Layout mestre
```

---

## 4. Roteiro de Implementação & TODOs

### Fase 1: Fundação & Regras de Projeto
- [x] Elaborar `RULES.md` definindo Clean Code, SOLID, tipagem estrita e ausência de comentários triviais.
- [x] Elaborar `ARCHITECTURE.md` com fundamentação matemática e desenho de software.
- [x] Criar `Makefile` para gerenciar comandos via `uv` e `npm`.

### Fase 2: Backend (FastAPI + LangChain + uv)
- [ ] Configurar `backend/pyproject.toml` com FastAPI, LangChain, Pydantic, SQLAlchemy, Pillow, NumPy e Ruff.
- [ ] Implementar `app/domain/models` e `app/domain/schemas` (entidades tipadas).
- [ ] Implementar `PromptEngineService` com LangChain para compilar as 180 combinações com controle multilíngue (PT/EN).
- [ ] Implementar `ImageGenerator` Protocol e instâncias (`MockGenerator`, `DalleGenerator`, `StabilityGenerator`).
- [ ] Implementar `ita_calculator.py` e `monk_scale.py` com testes matemáticos unitários.
- [ ] Implementar `CodebookAuditor` com LangChain para auditoria qualitativa multimodal.
- [ ] Implementar `AuditRunner` assíncrono com WebSocket para notificações em tempo real.
- [ ] Implementar endpoints REST e WebSocket na API v1.
- [ ] Desenvolver suíte de testes unitários com pytest alcançando alta cobertura.

### Fase 3: Frontend (Vite + React + TypeScript + Tailwind)
- [ ] Inicializar projeto Vite + React + TypeScript + Tailwind CSS.
- [ ] Implementar cliente de API e conexão WebSocket em `src/services/api.ts`.
- [ ] Desenvolver **Audit Studio**: seletor visual dos 4 fatores experimentais (Sistemas, Raças, Ocupações, Regiões), visualizador de prompt montado e botão de disparo.
- [ ] Desenvolver **Batch Monitor**: progresso em tempo real, contadores de sucesso/erro e galeria de imagens.
- [ ] Desenvolver **Metrics Dashboard**: gráficos de distribuição fenotípica (ITA) e Monk Skin Tone por ocupação e região.
- [ ] Desenvolver **Modal de Inspeção Qualitativa**: conferência de tags de estereótipo e edição de codebook pelo pesquisador.

### Fase 4: Validação & Verificação
- [ ] Executar pipeline com o gerador Mock para validar as 180 condições sem custo de API.
- [ ] Executar testes de unidade com `uv run pytest`.
- [ ] Validar conformidade de lint com `uv run ruff check`.
- [ ] Testar integração ponta a ponta (Frontend <-> Backend WebSocket e REST).
