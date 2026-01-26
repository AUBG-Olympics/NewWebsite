# Development commands
gum:
	./scripts/gum-menu.sh

start-frontend:
	cd frontend && pnpm dev

start-backend:
	bash scripts/start-backend.sh

start-all:
	@echo "Starting frontend and backend..."
	@trap 'kill 0' EXIT; \
	(cd frontend && pnpm dev) & \
	(cd backend && . ./venv/bin/activate && python3 -m src.entry) & \
	wait

# Build commands
build-frontend:
	cd frontend && pnpm install && pnpm build

build-backend:
	bash scripts/start-backend.sh --build-only

build-all: build-frontend build-backend

.PHONY: start-frontend start-backend start-all build-frontend build-backend build-all gum
