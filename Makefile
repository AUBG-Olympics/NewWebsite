# Development commands
gum:
	./scripts/gum-menu.sh

start-frontend:
	cd frontend && pnpm dev

start-backend:
	cd backend && python -m src.entry

start-all:
	@echo "Starting frontend and backend..."
	@cd frontend && pnpm dev & \
	cd ../backend && python -m src.entry &

# Build commands
build-frontend:
	cd frontend && pnpm install && pnpm build

build-backend:
	cd backend && pip install -r requirements.txt

build-all: build-frontend build-backend

.PHONY: start-frontend start-backend start-all build-frontend build-backend build-all gum
