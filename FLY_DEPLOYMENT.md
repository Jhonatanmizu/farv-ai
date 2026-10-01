# Guia de Deploy no Fly.io: FARV-IA

Este documento orienta o deploy completo da plataforma **FARV-IA** na nuvem da [Fly.io](https://fly.io), utilizando contêiner único unificado (React SPA + FastAPI + WebSocket) e Volume Persistente para o SQLite e imagens dérmicas geradas.

---

## 1. Pré-requisitos

1. **Fly CLI (`flyctl`)** instalado e autenticado:
   ```bash
   fly auth whoami
   ```
   *(Caso não esteja logado, execute `fly auth login`)*

2. **Chaves de API** (opcionais para o gerador Mock, obrigatórias para auditorias reais com IA):
   - OpenAI API Key (`OPENAI_API_KEY`)
   - Stability AI Key (`STABILITY_API_KEY`)

---

## 2. Passo a Passo de Deploy

### Passo 2.1: Criar a Aplicação no Fly.io

No diretório raiz do projeto:

```bash
fly launch --no-deploy
```

- Quando perguntado pelo nome do app, utilize `farv-ia` (ou outro nome único caso `farv-ia` já esteja em uso globalmente).
- Escolha a região primária: **`gru` (São Paulo, Brasil)**.
- O arquivo `fly.toml` já está pré-configurado na raiz do repositório. Se o `fly launch` pedir para sobrescrever o `fly.toml`, certifique-se de que os blocos `[mounts]` e `[env]` descritos abaixo permaneçam intactos.

### Passo 2.2: Criar o Volume Persistente

O SQLite (`farv_ia.sqlite`) e os arquivos de imagens geradas (`/data/images`) ficam salvos em um volume persistente para não serem apagados ao reiniciar ou atualizar a máquina:

```bash
fly volumes create farv_ia_data --region gru --size 1
```
*(Você pode aumentar para `--size 3` ou mais futuramente se for armazenar milhares de imagens geradas).*

### Passo 2.3: Configurar os Secrets (Chaves de API)

Defina as variáveis sensíveis como segredos criptografados no Fly.io:

```bash
fly secrets set OPENAI_API_KEY="sua-chave-openai-aqui" STABILITY_API_KEY="sua-chave-stability-aqui"
```

> **Nota:** Se você deseja apenas rodar o modo determinístico/Mock para demonstração ou testes científicos sem custo de API, não é obrigatório definir as chaves.

### Passo 2.4: Realizar o Deploy

Execute o deploy a partir do Dockerfile multi-stage raiz:

```bash
fly deploy
```

O Fly.io irá:
1. Compilar o frontend React/Vite com Node 20.
2. Sincronizar as dependências Python via `uv` com Python 3.11.
3. Montar a imagem de produção contendo API, WebSocket e SPA.
4. Anexar o volume persistente em `/data`.
5. Executar os health checks na rota `/health`.

---

## 3. Comandos Úteis de Operação

### Visualizar Logs em Tempo Real
```bash
fly logs
```

### Abrir o Dashboard Web no Navegador
```bash
fly open
```

### Verificar Status da Máquina e Volume
```bash
fly status
fly volumes list
```

### Conectar no Terminal SSH da Máquina
```bash
fly ssh console
```
Para inspecionar o banco de dados e imagens gravadas:
```bash
ls -lh /data
ls -lh /data/images
```

---

## 4. Arquitetura em Produção

```
           [ Internet / Usuário ]
                      │ (HTTPS / WSS)
                      ▼
         Fly.io Anycast Edge (gru)
                      │
                      ▼
 ┌───────────────────────────────────────────────┐
 │               Fly Machine (gru)               │
 │                                               │
 │  ┌─────────────────────────────────────────┐  │
 │  │        FastAPI (Uvicorn - :8000)        │  │
 │  ├─────────────────────────────────────────┤  │
 │  │  • /api/v1/*        -> REST Endpoints   │  │
 │  │  • /api/v1/ws/*     -> WebSocket Stream │  │
 │  │  • /static/images/* -> Imagens dérmicas │  │
 │  │  • /assets/* & /*   -> React SPA Dist   │  │
 │  └─────────────────────────────────────────┘  │
 │                        │                      │
 └────────────────────────┼──────────────────────┘
                          │ (Montagem de Volume)
                          ▼
            ┌───────────────────────────┐
            │   Fly Persistent Volume   │
            │          /data            │
            │  ├── farv_ia.sqlite       │
            │  └── images/              │
            └───────────────────────────┘
```
