# Goldsky subgraph — MezrangeVault

Indexes the live vault on Mezo testnet.

| Field | Value |
|-------|-------|
| **Contract** | `0x520a8466d4616c9d8b3f23B98fD4f8AA50500D8B` |
| **Start block** | `13378088` |
| **Network** | `mezo-testnet` |
| **GraphQL URL** | https://api.goldsky.com/api/public/project_cmp2yui5905ct01we90crcu19/subgraphs/mezorange-mezo-testnet/1.0.0/gn |

## Redeploy

```bash
npm run compile
npm run goldsky:deploy
npm run goldsky:verify
```

Requires `goldsky login` and a free subgraph slot on your Goldsky project.

## Verify

```bash
npm run goldsky:verify
```

Expect at least **1** `ownershipTransferred` at block 13378088. Deposits/rebalances appear after on-chain activity.

## Old endpoint (broken — wrong contract)

Do **not** use `mezorange/1.0.0` — it indexed from block 13327162 on the wrong address and returns zero vault events.
