#!/usr/bin/env bash
set -euo pipefail

# Mezrange Pro Vault — Testnet deploy helper
#
# This script is intended for bash environments (macOS/Linux/WSL/Git Bash).
# On Windows PowerShell, run via WSL or Git Bash:
#   wsl ./deploy.sh
#
# Required env vars (root):
#   PRIVATE_KEY=...
#   TESTNET_RPC=https://rpc.test.mezo.org
#
# Optional (to deploy a vault as well, not just factory + mock tokens):
#   POOL_ADDRESS=0x...
#   NPM_ADDRESS=0x...
#   SWAP_ROUTER_ADDRESS=0x...
#   DEPLOY_DIRECT_VAULT=true|false
#
# Keeper env vars:
#   KEEPER_PRIVATE_KEY=...         (defaults to PRIVATE_KEY if not set)
#
# Frontend env vars:
#   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Installing root dependencies"
cd "$ROOT_DIR"
npm install

if [[ ! -f ".env" ]]; then
  echo "==> Creating .env from .env.example"
  cp .env.example .env
fi

echo "==> Running contract tests"
npm test

echo "==> Deploying to Mezo testnet"
npm run deploy:mezo

echo "==> Setting up keeper"
cd "$ROOT_DIR/keeper"
npm install

if [[ ! -f ".env" ]]; then
  echo "==> Creating keeper/.env from keeper/.env.example"
  cp .env.example .env
fi

echo "==> Keeper typecheck"
npm run build

echo "==> Building frontend"
cd "$ROOT_DIR/frontend"
npm install

if [[ ! -f ".env.local" ]]; then
  echo "==> Creating frontend/.env.local from frontend/.env.example"
  cp .env.example .env.local
fi

npm run build

echo ""
echo "Done."
echo ""
echo "Next manual steps:"
echo "  - Update keeper/.env with VAULT_ADDRESS (from deploy output)"
echo "  - Update frontend/.env.local with NEXT_PUBLIC_FACTORY_ADDRESS and/or NEXT_PUBLIC_VAULT_ADDRESS"
echo "  - Start keeper:   (cd keeper && npm run start)"
echo "  - Start frontend: (cd frontend && npm run dev)"

