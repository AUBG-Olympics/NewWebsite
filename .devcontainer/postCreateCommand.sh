#!/bin/sh

if [ -d /workspaces/frontend ]; then
  cd /workspaces/frontend && pnpm install
fi

if [ -d /workspaces/backend ]; then
  cd /workspaces/backend && pnpm install
fi
# Any other shared setup goes here