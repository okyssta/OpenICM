#!/bin/sh
set -e

echo "[openicm] Applying database schema..."
npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate

if [ "$SEED_ON_START" = "true" ]; then
  echo "[openicm] Seeding sample data..."
  npx prisma db seed || echo "[openicm] Seed skipped or already present."
fi

echo "[openicm] Starting server..."
exec npm start
