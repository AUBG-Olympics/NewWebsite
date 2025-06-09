gum:
	./scripts/gum-menu.sh

start-frontend:
	cd frontend && pnpm dev

start-backend:
	cd backend && pnpm dev

start-all:
	pnpm --filter ./frontend dev & pnpm --filter ./backend dev
