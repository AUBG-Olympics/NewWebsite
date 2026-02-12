#!/bin/bash
set -e

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

choice=$(gum choose "Start Frontend" "Start Backend" "Start Both")

case "$choice" in
  "Start Frontend")
    echo "Starting frontend via Docker..."
    docker compose up frontend
    ;;
  "Start Backend")
    echo "Starting backend via Docker..."
    docker compose up backend
    ;;
  "Start Both")
    echo "Starting frontend and backend via Docker..."
    docker compose up
    ;;
esac
