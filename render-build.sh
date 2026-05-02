#!/usr/bin/env bash
set -e

export RENDER=true
export CI=true

echo "▶ Installing pnpm..."
npm install -g pnpm@10 2>/dev/null || true
export PATH="$PATH:$(npm root -g)/.bin"

# Fallback: use npx if global install failed
if ! command -v pnpm &> /dev/null; then
  echo "  Using npx pnpm fallback..."
  alias pnpm="npx --yes pnpm@10"
fi

echo "▶ Installing dependencies..."
pnpm install --no-frozen-lockfile

echo "▶ Building EVE API server..."
pnpm --filter @workspace/api-server run build

echo "✅ Build complete!"
