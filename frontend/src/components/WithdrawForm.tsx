"use client";

import { useState } from "react";
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "viem";
import { mezrangeVaultAbi } from "@/lib/abis";
import { formatTokenAmount } from "@/lib/format";

type WithdrawFormProps = {
  vaultAddress: `0x${string}`;
};

export function WithdrawForm({ vaultAddress }: WithdrawFormProps) {
  const { address } = useAccount();
  const [shares, setShares] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const { data: decimals } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "decimals",
  });

  const { data: symbol } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "symbol",
  });

  const { data: userShares, refetch: refetchBalance } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContractAsync: redeem, data: redeemHash } = useContractWrite();
  const { isLoading: waiting } = useWaitForTransactionReceipt({ hash: redeemHash });

  async function handleWithdraw() {
    if (!address || !decimals) return;

    try {
      setStatus("Withdrawing…");
      const parsedShares = parseUnits(shares || "0", Number(decimals));

      await redeem({
        address: vaultAddress,
        abi: mezrangeVaultAbi,
        functionName: "redeemDual",
        args: [parsedShares, address, address],
      });

      setStatus("Withdrawal confirmed.");
      setShares("");
      refetchBalance();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Withdraw failed.");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-lg font-semibold text-zinc-50">Withdraw</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Redeem vault shares for both underlying tokens.
      </p>

      <p className="mt-3 text-sm text-zinc-500">
        Balance:{" "}
        <span className="font-medium text-zinc-200">
          {formatTokenAmount(userShares as bigint | undefined, Number(decimals ?? 18))}{" "}
          {(symbol as string) ?? "shares"}
        </span>
      </p>

      <label className="mt-4 block text-sm">
        <span className="text-zinc-400">Shares to redeem</span>
        <input
          type="number"
          min="0"
          step="any"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-orange-500"
          placeholder="0.0"
        />
      </label>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={!userShares}
          onClick={() =>
            setShares(
              formatTokenAmount(userShares as bigint, Number(decimals ?? 18), 18).replace(
                /,/g,
                "",
              ),
            )
          }
          className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
        >
          Max
        </button>
      </div>

      <button
        type="button"
        disabled={!address || waiting || !shares}
        onClick={handleWithdraw}
        className="mt-4 w-full rounded-lg border border-zinc-600 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-orange-500 hover:text-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {waiting ? "Processing…" : "Withdraw"}
      </button>

      {status && <p className="mt-3 text-xs text-zinc-400">{status}</p>}
    </div>
  );
}
