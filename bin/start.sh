#!/bin/sh
set -e
echo "==> OpenICM Quick Start"
echo "==> Building and starting containers..."
cd "$(dirname "$0")/.."
docker compose up --build -d
echo ""
echo "==> OpenICM is running at http://localhost:3000"
echo "==> Sample data is pre-loaded."
echo "==> Run 'docker compose down' to stop."
