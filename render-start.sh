#!/usr/bin/env bash
set -e

echo "▶ Applying database schema..."
pnpm --filter @workspace/db run push

echo "▶ Starting EVE API server..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
