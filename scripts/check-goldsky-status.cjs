const url =
  "https://api.goldsky.com/api/public/project_cmp2yui5905ct01we90crcu19/subgraphs/mezorange-mezo-testnet/1.0.0/gn";

async function q(name, query, variables) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  console.log(`\n=== ${name} ===`);
  if (json.errors) console.log("ERR:", json.errors[0]?.message);
  else console.log(JSON.stringify(json.data, null, 2));
}

async function main() {
  await q("_meta", `{ _meta { block { number } deployment hasIndexingErrors } }`);

  await q("counts", `{
    depositeds(first: 1) { id contractId_ block_number }
    withdrawns(first: 1) { id contractId_ }
    rebalanceds(first: 1) { id contractId_ }
    feesCompoundeds(first: 1) { id contractId_ }
  }`);

  const vault = "0x520a8466d4616c9d8b3f23b98fd4f8aa50500d8b";
  await q("vault filter", `
    query($c: [String!]) {
      depositeds(first: 5, where: { contractId__in: $c }) { id contractId_ user block_number }
      rebalanceds(first: 5, where: { contractId__in: $c }) { id contractId_ block_number }
    }
  `, { c: [vault] });
}

main().catch(console.error);
