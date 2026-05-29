require("dotenv").config();

const url =
  process.env.PUBLIC_GRAPHQL_LINK ||
  process.env.NEXT_PUBLIC_GOLDSKY_GRAPHQL_URL ||
  process.env.GOLDSKY_GRAPHQL_URL;

if (!url) {
  console.error("Missing PUBLIC_GRAPHQL_LINK / NEXT_PUBLIC_GOLDSKY_GRAPHQL_URL");
  process.exit(1);
}

async function main() {
  const query = /* GraphQL */ `
    query {
      __schema {
        queryType {
          fields {
            name
          }
        }
      }
      rebalancedType: __type(name: "Rebalanced") {
        name
        fields {
          name
          type {
            kind
            name
            ofType {
              kind
              name
            }
          }
        }
      }
      feesCompoundedType: __type(name: "FeesCompounded") {
        name
        fields {
          name
          type {
            kind
            name
            ofType {
              kind
              name
            }
          }
        }
      }
    }
  `;

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) {
    console.error(JSON.stringify(json.errors, null, 2));
    process.exit(1);
  }

  const fields = json.data.__schema.queryType.fields.map((f) => f.name);
  console.log("Query fields:");
  for (const f of fields) console.log("-", f);

  for (const t of [json.data.rebalancedType, json.data.feesCompoundedType].filter(Boolean)) {
    console.log(`\nType fields: ${t.name}`);
    for (const f of t.fields) console.log("-", f.name);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

