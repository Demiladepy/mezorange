# Mezrange Pro Vault (Mezo Testnet)

An ERC‑4626 vault that manages a **single Uniswap V3 concentrated liquidity position** and an off‑chain keeper that rebalances when the position drifts out of range on **Mezo Testnet (chainId 31611)**.

This repository contains:
- **Smart contracts** (`contracts/`): `MezrangeVault` + `MezrangeVaultFactory`
- **Keeper bot** (`keeper/`): monitors pool + triggers `rebalance()` when profitable/safe
- **Frontend** (`frontend/`): dashboard + vault page (Passport / RainbowKit / wagmi)

## Architecture (text diagram)

```
┌───────────────────────────────────────────────────────────────────────────┐
│                               Frontend (Next.js)                           │
│   - RainbowKit + wagmi + Passport                                           │
│   - Reads vault + pool state, charts range vs price                         │
│   - Sends tx: approve → depositDual / redeemDual                            │
│   - (keeper only) manual rebalance()                                        │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ JSON-RPC (Mezo Testnet)
                ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                         MezrangeVault (ERC-4626)                            │
│  - Holds token0/token1 + 1 Uniswap V3 position NFT                          │
│  - depositDual / redeemDual (two-token flows)                               │
│  - needsRebalance() gate + keeper-only rebalance()                          │
│  - pause/unpause for emergency maintenance                                  │
└───────────────┬────────────────────────────────────────────────────────────┘
                │ interacts
                ▼
┌──────────────────────────────┐     ┌──────────────────────────────────────┐
│ Uniswap V3 Pool (slot0 tick) │<--->│  NonfungiblePositionManager (NFT)     │
└──────────────────────────────┘     └──────────────────────────────────────┘
                 \
                  \  (during rebalance)
                   ▼
             ┌──────────────────┐
             │   SwapRouter      │
             └──────────────────┘

┌───────────────────────────────────────────────────────────────────────────┐
│                               Keeper Bot (Node)                             │
│  - Watches blocks / pool swaps                                               │
│  - Calls needsRebalance()                                                    │
│  - If safe/profitable: sends rebalance() with gas estimate + buffer          │
│  - Retries transient failures with backoff                                   │
└───────────────────────────────────────────────────────────────────────────┘
```

## Intelligent rebalancing decision (gas-aware threshold)

The system separates **on-chain “should rebalance?”** from **off-chain “should we pay gas now?”**:

### On-chain: `needsRebalance()`
`MezrangeVault.needsRebalance()` returns true when the price (tick) is:
- **out of range**, or
- **within a warning margin** near the lower/upper bound (threshold is `rebalanceThresholdBps` of range width).

This is a deterministic safety signal and does **not** consider gas cost or profitability.

### Off-chain: keeper “gas-aware” decision
The keeper bot:
- Checks `needsRebalance()`
- Estimates gas for `rebalance()`
- Applies a **gas-aware policy** before sending the tx (example policy):
  - skip if gas estimate is above a configured ceiling
  - skip if expected incremental fees / risk reduction is not worth current gas
  - wait for better conditions (lower gas / stabilized price)

### Slippage / adverse conditions protections
Inside `rebalance()` and supporting helpers:
- **Swap size is capped** (`_capSwapInput`) to avoid draining pool depth during rebalances.
- Optional **slippage bound** via `rebalanceSwapSlippageBps` to protect against bad fills.
- If slippage constraints fail or price moves mid‑tx, the rebalance reverts; the keeper retries later.

## Quickstart

### Prerequisites
- Node.js 18+
- npm
- A funded Mezo Testnet EOA for deployment/keeper
- (Recommended) WSL or Git Bash if you want to run `deploy.sh` on Windows

### Install root dependencies

```bash
npm install
cp .env.example .env
```

## Local development

### 1) Run smart contract tests

```bash
npm test
```

### 2) Deploy to Mezo Testnet

Edit `.env`:
- `PRIVATE_KEY` (testnet key)
- `TESTNET_RPC` (default: `https://rpc.test.mezo.org`)

Then:

```bash
npm run deploy:mezo
```

Notes:
- `scripts/deploy.ts` currently uses **placeholder** Uniswap periphery addresses unless you set:
  - `NPM_ADDRESS`
  - `SWAP_ROUTER_ADDRESS`
  - `POOL_ADDRESS`
- If `POOL_ADDRESS` is not set, the script deploys factory + mock tokens and **skips vault creation**.

### 3) Start the keeper bot

```bash
cd keeper
npm install
cp .env.example .env
```

Set in `keeper/.env`:
- `KEEPER_PRIVATE_KEY`
- `TESTNET_RPC`
- `VAULT_ADDRESS`
- (optional) `POOL_ADDRESS`

Run:

```bash
npm run start
```

### 4) Run the frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

Set in `frontend/.env.local`:
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_FACTORY_ADDRESS` and/or `NEXT_PUBLIC_VAULT_ADDRESS`

Run:

```bash
npm run dev
```

## Edge cases & operational behavior

### Extreme volatility (price whipsaw)
- **Symptom**: price crosses in/out of range rapidly; rebalancing too often can churn gas and fees.
- **Mitigation**:
  - keeper uses gas-aware logic (wait for stabilization, enforce minimum delay between rebalances)
  - prefer wider ranges (`RangeWidth`) during high vol
  - slippage caps prevent huge swaps when market is unstable

### Low liquidity pools → high slippage
- **Symptom**: swap needed to rebalance causes large price impact or cannot meet `amountOutMinimum`.
- **Mitigation**:
  - `_capSwapInput` limits swap input size during rebalances
  - `rebalanceSwapSlippageBps` can be tightened/relaxed
  - keeper detects repeated slippage failures and backs off / alerts

### Gas spikes make rebalance unprofitable
- **Symptom**: `needsRebalance()` true but gas cost > expected benefit.
- **Mitigation**:
  - keeper estimates gas and skips until gas normalizes
  - manual “Rebalance” remains available for keeper if urgent

### Failed rebalance due to slippage check
- **Symptom**: `rebalance()` reverts mid-call due to slippage bound / adverse movement.
- **Behavior**:
  - state remains unchanged (atomic revert)
  - keeper records failure and retries with backoff (or after new price/tick update)

### Emergency pause (maintenance mode)
- **Symptom**: owner calls `pause()` to stop deposits/withdrawals/rebalances.
- **Behavior**:
  - vault methods guarded by `whenNotPaused` revert
  - frontend shows a **Maintenance Mode** banner
  - keeper will not be able to rebalance until unpaused

### Keeper retry strategy
- Categorizes errors:
  - **revert** (e.g. `RebalanceNotNeeded`, slippage) → wait for state change, retry later
  - **RPC / network** issues → exponential backoff
  - **insufficient funds / nonce** issues → requires operator action

## Maintenance commitment (6 months)

For 6 months after submission:
- **Bug fixes**: functional defects, keeper reliability issues, frontend breakages
- **Updates**: dependency updates for security/compatibility as needed
- **Support**: questions and troubleshooting via Discord (share invite in submission / README header if required)

## Automation: one-shot testnet deploy/build

Use the included script:

```bash
./deploy.sh
```

See `deploy.sh` header for required env vars and Windows notes (WSL/Git Bash).
