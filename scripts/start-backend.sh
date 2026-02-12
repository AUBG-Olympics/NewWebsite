#!/bin/bash
set -e

cd "$(dirname "$0")/../backend"

# Create venv if it doesn't exist
if [ ! -d venv ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate and install/run
. ./venv/bin/activate

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Starting backend on http://127.0.0.1:4000"
python3 -m src.entry
