#!/bin/bash
set -e

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

choice=$(gum choose "Start Frontend" "Start Backend" "Start Both")

case "$choice" in
  "Start Frontend")
    cd "$ROOT_DIR/frontend"
    pnpm dev
    ;;
  "Start Backend")
    cd "$ROOT_DIR/backend"
    ./venv/bin/python -m src.entry
    ;;
  "Start Both")
    cd "$ROOT_DIR"
    make start-all
    ;;
esac
