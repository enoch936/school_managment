#!/usr/bin/env bash
# ==============================================================================
# Development Environment Setup Script
# ==============================================================================
set -euo pipefail

echo "[1/4] Checking Node and pnpm versions..."
node -v
pnpm -v

echo "[2/4] Installing dependencies across workspaces..."
pnpm install

echo "[3/4] Generating Prisma client..."
pnpm --filter @sms/backend prisma:generate

echo "[4/4] Setting up environment variables..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Copied .env.example to .env. Please configure your database credentials."
fi

echo "======================================================================"
echo "Setup complete! Run 'pnpm dev' to start both frontend and backend."
echo "======================================================================"
