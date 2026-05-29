"use client";

import { goldskyGraphqlUrl } from "@/lib/env";

export type GoldskyGraphQLError = {
  message: string;
};

export async function goldskyQuery<TData>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<TData> {
  if (!goldskyGraphqlUrl) {
    throw new Error("Missing NEXT_PUBLIC_GOLDSKY_GRAPHQL_URL");
  }

  const res = await fetch(goldskyGraphqlUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as {
    data?: TData;
    errors?: GoldskyGraphQLError[];
  };

  if (!res.ok) {
    throw new Error(`Goldsky request failed: ${res.status}`);
  }
  if (json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "Goldsky GraphQL error");
  }
  if (!json.data) {
    throw new Error("Goldsky returned no data");
  }
  return json.data;
}

