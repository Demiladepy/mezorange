# Mezrange Vault

One-line description: **Automated LP rebalancing vault for Mezo's CL DEX.**

**Live demo:** _Deploy to Vercel and add link here_

**Track:** LP Rebalancing Vault bounty (Mezo Hackathon 2026)

> **Security:** Never commit `.env`, `.env.local`, or private keys. Rotate any key that was ever exposed.

## What's in v0.1

| Component | Address | Notes |
|-----------|---------|-------|
| **BTC/MUSD CL pool** | [`0xB34cAF03F2a326B3b7eBaCeed6295a39Be8D7139`](https://explorer.test.mezo.org/address/0xB34cAF03F2a326B3b7eBaCeed6295a39Be8D7139) | Created block **13377993**, tickSpacing **200** |
| **MezrangeVault (live)** | [`0x520a8466d4616c9d8b3f23B98fD4f8AA50500D8B`](https://explorer.test.mezo.org/address/0x520a8466d4616c9d8b3f23B98fD4f8AA50500D8B) | Direct deploy, block **13378088** |
| **MezrangeVaultFactory** | [`0x073580C5F37158F563B17983af142dc874c018aa`](https://explorer.test.mezo.org/address/0x073580C5F37158F563B17983af142dc874c018aa) | Deployed; v0.1 vault uses direct deploy (factory `createVault` hits Mezo gas cap) |
| **Goldsky subgraph** | `mezorange-mezo-testnet/1.0.0` | Vault `0x520a…` from block **13378088** |

- **MezrangeVault contract:** Slipstream-compatible (`tickSpacing`, not `fee`) — see `contracts/interfaces/INonfungiblePositionManager.sol` and `ISwapRouter.sol`
- **Frontend:** Hyperliquid-inspired dashboard, vault detail page, deposit/withdraw UI, Goldsky activity feed, range visualizer
- **Keeper bot:** gas-aware rebalance monitoring (manual `rebalance()` from UI in v0.1)

## Why this scope

Three honest decisions:

1. **Direct vault deploy instead of factory.** Mezo testnet enforces a ~3M gas cap per tx; `factory.createVault` exceeds it. v0.1 ships a live vault via direct deploy (`scripts/deploy.ts`, `DEPLOY_DIRECT_VAULT=true` by default). Factory bytecode is ready for a future network upgrade or batched deploy pattern.

2. **Slipstream over Uniswap V3.** Mezo's CL system uses `tickSpacing` parameters, not `fee`. The vault was adapted to match — documented in `contracts/interfaces/INonfungiblePositionManager.sol`.

3. **Manual rebalance only.** Keeper bot integration belongs in v0.2 once we can verify rebalance logic against sustained live pool activity. Automating untested rebalance is how funds get drained.

**Known limitation:** Mezo native BTC (`0x7670…`) does not support standard ERC-20 `approve`. Dual-token deposits may require Mezo-specific handling until token interfaces stabilize.

## What v0.2 looks like

- Chainlink Automation / Gelato keeper for auto-rebalance
- Performance fee logic + collection
- Position dashboard with IL tracking
- Factory deploy path once gas limits allow or via CREATE2 proxy pattern

## Maintenance commitment

6 months minimum post-deployment. Available via Discord/X handle _(add yours)_.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js + RainbowKit)                       │
│  Dashboard · vault detail · deposit/withdraw · Goldsky activity feed    │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │ JSON-RPC (Mezo Testnet, chain 31611)
                                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    MezrangeVault (ERC-4626)                              │
│  depositDual / redeemDual · needsRebalance() · keeper rebalance()        │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  Slipstream CL Pool    NonfungiblePositionManager   CLSwapRouter
  (BTC/MUSD ts=200)

┌─────────────────────────────────────────────────────────────────────────┐
│  Goldsky subgraph — indexes Deposited, Withdrawn, Rebalanced, Fees…     │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  Keeper bot (Node) — gas-aware needsRebalance() watcher (v0.2 auto)     │
└─────────────────────────────────────────────────────────────────────────┘
```

See also the [intelligent rebalancing](#intelligent-rebalancing-decision-gas-aware-threshold) section below for keeper policy details.

## Tech

Solidity 0.8.18 · Hardhat · Slipstream-compatible interfaces · ERC-4626 vault · Goldsky subgraph · Next.js + RainbowKit frontend on Vercel.

## Repo layout

- `contracts/` — `MezrangeVault`, `MezrangeVaultFactory`, Slipstream interfaces
- `scripts/` — `create-pool.ts`, `deploy.ts`, Goldsky introspection helper
- `keeper/` — off-chain rebalance bot
- `frontend/` — Next.js App Router UI (dashboard + `/vault/[address]`)
- `test/` — Hardhat contract tests

---

## Quickstart

### Prerequisites

- Node.js 18+
- npm
- A funded Mezo Testnet EOA
- WalletConnect project ID (for RainbowKit)

### Install & test

```bash
npm install
cp .env.example .env
npm test
```

### Deploy pool + vault (Mezo testnet)

Edit root `.env`:

- `PRIVATE_KEY` — testnet key (never commit)
- `TESTNET_RPC` — default `https://rpc.test.mezo.org`

Create the BTC/MUSD pool (once):

```bash
npm run create-pool:mezo
```

Deploy the vault against that pool:

```bash
npm run deploy:mezo
```

Copy deploy output into `frontend/.env.local`:

```bash
NEXT_PUBLIC_VAULT_ADDRESS=0x520a8466d4616c9d8b3f23B98fD4f8AA50500D8B
NEXT_PUBLIC_POOL_ADDRESS=0xB34cAF03F2a326B3b7eBaCeed6295a39Be8D7139
NEXT_PUBLIC_GOLDSKY_GRAPHQL_URL=https://api.goldsky.com/api/public/project_cmp2yui5905ct01we90crcu19/subgraphs/mezorange-mezo-testnet/1.0.0/gn
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

### Run frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Run keeper (optional)

```bash
cd keeper
npm install
cp .env.example .env
# set VAULT_ADDRESS, POOL_ADDRESS, KEEPER_PRIVATE_KEY
npm run start
```

## Intelligent rebalancing decision (gas-aware threshold)

The system separates **on-chain “should rebalance?”** from **off-chain “should we pay gas now?”**:

### On-chain: `needsRebalance()`

`MezrangeVault.needsRebalance()` returns true when the price (tick) is out of range, or within a warning margin near the lower/upper bound (`rebalanceThresholdBps` of range width).

### Off-chain: keeper gas-aware decision

The keeper checks `needsRebalance()`, estimates gas for `rebalance()`, and skips when gas cost exceeds expected benefit.

### Protections

- Swap size capped during rebalances
- Optional slippage bound via `rebalanceSwapSlippageBps`
- `pause()` for emergency maintenance

## Edge cases & operational behavior

### Extreme volatility

Keeper uses gas-aware logic and prefers wider ranges during high vol.

### Low liquidity → slippage

`_capSwapInput` limits swap size; keeper backs off on repeated slippage failures.

### Gas spikes

Keeper skips until gas normalizes; manual rebalance remains available.

### Emergency pause

Owner `pause()` stops deposits/withdrawals/rebalances; frontend shows a maintenance banner.

## Maintenance commitment (6 months)

For 6 months after submission: bug fixes, dependency security updates, and support via Discord _(add invite)_.

## One-shot deploy script

```bash
./deploy.sh
```

See `deploy.sh` for env vars and Windows notes (WSL/Git Bash).
