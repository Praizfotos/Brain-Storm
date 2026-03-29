.PHONY: setup dev test build lint clean help

help:
	@echo "Brain-Storm Makefile"
	@echo "--------------------"
	@echo "make setup   - Install dependencies and build contracts"
	@echo "make dev     - Start backend and frontend in development mode"
	@echo "make test    - Run all tests (backend, frontend, contracts)"
	@echo "make build   - Build all apps (production mode)"
	@echo "make lint    - Run linter on all apps"
	@echo "make clean   - Remove node_modules and target files"

setup:
	@echo "==> Installing Node.js dependencies..."
	npm install
	@echo "==> Building smart contracts..."
	rustup target add wasm32-unknown-unknown
	./scripts/build.sh
	@echo "==> Setup complete!"

dev:
	@echo "==> Starting backend and frontend..."
	npm run dev:backend & npm run dev:frontend

test:
	@echo "==> Running all tests..."
	npm run test

build:
	@echo "==> Building for production..."
	npm run build

lint:
	@echo "==> Running lint checks..."
	npm run lint

clean:
	@echo "==> Cleaning project..."
	rm -rf node_modules apps/backend/dist apps/frontend/.next target
