#!/bin/bash
set -e

choice=$(gum choose "Start Frontend" "Start Backend" "Start Both (Docker Compose)")

case "$choice" in
  "Start Frontend")
    cd frontend
    pnpm dev
    ;;
  "Start Backend")
    cd backend
	python -m src.entry
    ;;
  "Start Both (Docker Compose)")
    docker-compose up
    ;;
esac
