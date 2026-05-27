# Submission Demo Guide (Video Walkthrough)

This is a suggested, narrative walkthrough for a 3–6 minute demo video.

## 0) Pre-demo setup (off-camera)

- Deployed contracts to **Mezo Testnet (31611)**
- `keeper` running and pointed at the deployed `VAULT_ADDRESS`
- `frontend` running with:
  - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
  - `NEXT_PUBLIC_FACTORY_ADDRESS` and/or `NEXT_PUBLIC_VAULT_ADDRESS`

Have two wallets ready:
- **MetaMask** (EVM) connected to Mezo Testnet
- A **Bitcoin wallet via Passport** (Unisat / OKX / Xverse)

## 1) Intro (10–15s)

- Open the app dashboard (`/`)
- Explain: “This is Mezrange — an ERC‑4626 vault that runs a Uniswap V3 position and rebalances automatically on Mezo Testnet.”

## 2) Show wallet connectivity (30–45s)

- Click **Connect Wallet**
- Connect with **MetaMask** and show the connected EVM address
- Disconnect (optional), then connect with a **Passport Bitcoin wallet**
- On the vault page, call out:
  - the Bitcoin wallet address (when connected via Passport)
  - the Mezo EVM address used for ERC‑20 contract interactions

## 3) Show dashboard → vault navigation (15–20s)

- From the dashboard, click into a vault card
- Mention what’s visible:
  - TVL, current range, rebalance count, fees earned

## 4) Deposit flow (45–60s)

- Show token balances (or mention they’re mock tokens on testnet)
- Fill in deposit amounts for token0/token1
- Click **Approve & Deposit**
- Confirm the tx in the wallet
- After confirmation, show updated metrics:
  - increased TVL / reserves

## 5) Range visualization (30–45s)

- Point at the “Price range vs pool” chart
- Explain:
  - orange band = active liquidity range
  - blue marker/line = current pool price derived from tick/slot0

## 6) Trigger a price move (optional but recommended, 60–90s)

Goal: demonstrate the vault needing a rebalance.

Options:
- Use a known swap UI on Mezo Testnet (if available) to trade against the pool
- Or run a script / test helper to move price (if you’ve set up local tooling)

Then:
- refresh the vault page and show **“Needs rebalance”**

## 7) Show automatic rebalance by keeper (45–90s)

- With the keeper bot running, wait for it to detect `needsRebalance()`
- Show:
  - the keeper terminal logs (detects, estimates gas, submits tx)
  - the vault UI updating: rebalance count increments, new range ticks
  - rebalance history log includes the new `Rebalanced` event

If you are the keeper address:
- Show the **Manual Rebalance** button becoming enabled when `needsRebalance` is true
- Optionally trigger it once to demonstrate the keeper-only access control

## 8) Withdraw flow (30–45s)

- Redeem a small share amount
- Show confirmation and balances changing

## 9) Wrap up (10–20s)

- Revisit dashboard
- Summarize:
  - “We can deposit/withdraw, visualize the range, and the keeper rebalances when price drifts — with slippage and gas-aware safeguards.”

