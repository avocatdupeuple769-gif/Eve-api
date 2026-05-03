#!/usr/bin/env bash
set -e

echo "Starting EVE API server..."
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
