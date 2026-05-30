import urllib.request
import json

url = "https://api.goldsky.com/api/public/project_cmp2yui5905ct01we90crcu19/subgraphs/mezorange/1.0.0/gn"

def query(q, variables=None):
    body = {"query": q}
    if variables:
        body["variables"] = variables
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())

print("=== _meta ===")
print(json.dumps(query("{ _meta { block { number } deployment hasIndexingErrors } }"), indent=2))

print("\n=== any events (first 5 each, no filter) ===")
print(json.dumps(query("""
{
  depositeds(first: 5, orderBy: block_number, orderDirection: desc) { id contractId_ block_number }
  withdrawns(first: 5, orderBy: block_number, orderDirection: desc) { id contractId_ block_number }
  rebalanceds(first: 5, orderBy: block_number, orderDirection: desc) { id contractId_ block_number }
}
"""), indent=2))

TARGET = "0x520a8466d4616c9d8b3f23b98fd4f8aa50500d8b"
print(f"\n=== filter by live vault {TARGET} ===")
print(json.dumps(query("""
query($c: [String!]) {
  depositeds(first: 5, where: { contractId__in: $c }) { id contractId_ block_number }
  rebalanceds(first: 5, where: { contractId__in: $c }) { id contractId_ block_number }
}
""", {"c": [TARGET]}), indent=2))

# Check old factory vault addresses if any events exist elsewhere
OLD_FACTORY = "0x073580c5f37158f563b17983af142dc874c018aa"
print(f"\n=== filter by old factory {OLD_FACTORY} (should be empty for vault events) ===")
print(json.dumps(query("""
query($c: [String!]) {
  depositeds(first: 5, where: { contractId__in: $c }) { id contractId_ block_number }
}
""", {"c": [OLD_FACTORY.lower()]}), indent=2))
