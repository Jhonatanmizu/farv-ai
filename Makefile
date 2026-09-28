.PHONY: help install dev test lint clean

help:
	@echo "Comandos disponíveis no FARV-IA:"
	@echo "  make install  - Instala dependências do backend (uv) e frontend (npm)"
	@echo "  make dev      - Inicia backend e frontend em modo de desenvolvimento"
	@echo "  make test     - Executa suíte de testes unitários do backend"
	@echo "  make lint     - Executa linter e checagem de tipos (ruff)"
	@echo "  make clean    - Remove arquivos temporários e caches"

install:
	cd backend && uv sync
	cd frontend && npm install

dev-backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && uv run pytest -v

lint:
	cd backend && uv run ruff check .
	cd backend && uv run ruff format --check .

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".ruff_cache" -exec rm -rf {} +
	rm -rf backend/data/*.sqlite
