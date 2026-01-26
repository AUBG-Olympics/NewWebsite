#!/bin/sh

# Install frontend dependencies
if [ -d /workspaces/frontend ]; then
  cd /workspaces/frontend && pnpm install
fi

# Install backend dependencies
if [ -d /workspaces/backend ]; then
  cd /workspaces/backend && python3 -m venv venv && . ./venv/bin/activate && pip install -r requirements.txt
fi