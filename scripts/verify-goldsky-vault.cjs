/**
 * Verify Goldsky subgraph + on-chain vault activity for live vault.
 * Usage: node scripts/verify-goldsky-vault.cjs
 */
require("dotenv").config();

const GOLDSKY =
  process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_URL ||
  process.env.GOLDSKY_GRAPHQL_URL ||
  "https://api.goldsky.com/api/public/project_cmp2yui5905ct01we90crcu19/subgraphs/mezorange-mezo-testnet/1.0.0/gn";

const RPC = process.env.TESTNET_RPC || "https://rpc.test.mezo.org";
const VAULT = (process.env.VAULT_ADDRESS || "0x520a8466d4616c9d8b3f23B98fD4f8AA50500D8B").toLowerCase();
const VAULT_DEPLOY_BLOCK = 13378088;

async function goldsky(q, variables) {
  const res = await fetch(GOLDSKY, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: q, variables }),
  });
  return res.json();
}

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function main() {
  console.log("=== Goldsky _meta ===");
  const meta = await goldsky(`{ _meta { block { number } deployment hasIndexingErrors } }`);
  console.log(JSON.stringify(meta.data?._meta ?? meta, null, 2));

  console.log("\n=== Goldsky: indexed events ===");
  const any = await goldsky(`{
    ownershipTransferreds(first: 5, orderBy: block_number, orderDirection: desc) { contractId_ block_number newOwner }
    depositeds(first: 5, orderBy: block_number, orderDirection: desc) { contractId_ block_number user }
    rebalanceds(first: 5, orderBy: block_number, orderDirection: desc) { contractId_ block_number }
  }`);
  const owners = any.data?.ownershipTransferreds ?? [];
  const deps = any.data?.depositeds ?? [];
  const rebs = any.data?.rebalanceds ?? [];
  console.log(`ownershipTransferreds: ${owners.length}, depositeds: ${deps.length}, rebalanceds: ${rebs.length}`);
  if (owners.length > 0) {
    console.log("Sample ownership:", JSON.stringify(owners[0], null, 2));
  }

  console.log(`\n=== Goldsky: filter live vault ${VAULT} ===`);
  const filtered = await goldsky(
    `query($c: [String!]) {
      depositeds(first: 5, where: { contractId__in: $c }) { id contractId_ block_number }
      rebalanceds(first: 5, where: { contractId__in: $c }) { id contractId_ block_number }
    }`,
    { c: [VAULT] },
  );
  console.log(JSON.stringify(filtered.data, null, 2));

  console.log("\n=== On-chain: vault deploy block + tx count ===");
  const code = await rpc("eth_getCode", [VAULT, "latest"]);
  console.log("Bytecode at vault:", code === "0x" ? "NONE (wrong address?)" : `${(code.length - 2) / 2} bytes`);

  const latestHex = await rpc("eth_blockNumber", []);
  const latest = parseInt(latestHex, 16);
  console.log("Chain head block:", latest);
  console.log("Expected vault deploy block:", VAULT_DEPLOY_BLOCK);
  console.log("Subgraph synced block:", meta.data?._meta?.block?.number);

  // Count txs TO vault since deploy (sample last 2000 blocks if range small)
  const fromBlock = Math.max(VAULT_DEPLOY_BLOCK, latest - 5000);
  const logs = await rpc("eth_getLogs", [
    {
      address: VAULT,
      fromBlock: "0x" + fromBlock.toString(16),
      toBlock: "latest",
    },
  ]);
  console.log(`\nOn-chain logs from vault ${VAULT} (blocks ${fromBlock}–${latest}):`, logs.length);
  if (logs.length > 0 && owners.length === 0) {
    console.log("\n⚠️  On-chain logs exist but subgraph has no ownershipTransferred → check datasource.");
  } else if (owners.length > 0) {
    console.log("\n✓ Subgraph is indexing the live vault (ownershipTransferred at deploy).");
    if (deps.length === 0 && rebs.length === 0) {
      console.log("  Deposits/rebalances will appear after first on-chain activity.");
    }
  } else if (logs.length === 0) {
    console.log("\n✓ No vault logs yet — empty subgraph is expected.");
  }

  console.log("\n=== Goldsky dashboard check (manual) ===");
  console.log("1. Open https://app.goldsky.com → subgraph mezorange-mezo-testnet/1.0.0");
  console.log("2. Data Sources must show:");
  console.log("   Address: 0x520a8466d4616c9d8b3f23B98fD4f8AA50500D8B");
  console.log("   Start block: 13378088");
  console.log("   Network: Mezo testnet (31611)");
  console.log("3. If wrong, re-create instant subgraph from MezrangeVault ABI at that address.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
