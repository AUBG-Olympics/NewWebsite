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
    pnpm run dev
    ;;
  "Start Both (Docker Compose)")
    docker-compose up
    ;;
esac
