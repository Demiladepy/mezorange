/**
 * Poll Goldsky until ownershipTransferred appears or timeout.
 */
const urls = [
  process.env.GOLDSKY_URL ||
    "https://api.goldsky.com/api/public/project_cmp2yui5905ct01we90crcu19/subgraphs/mezorange-mezo-testnet/1.0.0/gn",
  "https://api.goldsky.com/api/public/project_cmp2yui5905ct01we90crcu19/subgraphs/mezorange/1.0.0/gn",
];

async function check(url) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: `{
        _meta { block { number } hasIndexingErrors }
        ownershipTransferreds(first: 3, orderBy: block_number, orderDirection: desc) {
          id contractId_ block_number previousOwner newOwner
        }
        rebalanceds(first: 3, orderBy: block_number, orderDirection: desc) {
          id contractId_ block_number
        }
      }`,
    }),
  });
  return { url, json: await res.json() };
}

async function main() {
  for (const url of urls) {
    const { json } = await check(url);
    console.log("\n===", url.split("/subgraphs/")[1], "===");
    if (json.errors) {
      console.log("ERR:", json.errors[0]?.message);
      continue;
    }
    console.log("_meta:", JSON.stringify(json.data._meta));
    console.log("ownershipTransferreds:", json.data.ownershipTransferreds?.length ?? 0);
    if (json.data.ownershipTransferreds?.length) {
      console.log(JSON.stringify(json.data.ownershipTransferreds, null, 2));
    }
  }
}

main().catch(console.error);
