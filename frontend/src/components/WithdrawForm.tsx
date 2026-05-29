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
import { cn } from "@/lib/cn";

type WithdrawFormProps = {
  vaultAddress: `0x${string}`;
  embedded?: boolean;
};

export function WithdrawForm({ vaultAddress, embedded }: WithdrawFormProps) {
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
    <div className={cn(!embedded && "rounded-xl border border-white/5 bg-glass p-6 backdrop-blur-xl")}>
      {!embedded && (
        <>
          <h3 className="font-heading text-lg font-semibold text-text-primary">Withdraw</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Redeem vault shares for both underlying tokens.
          </p>
        </>
      )}

      <p className={cn("text-sm text-text-muted", !embedded && "mt-3")}>
        Balance:{" "}
        <span className="font-medium text-text-primary">
          {formatTokenAmount(userShares as bigint | undefined, Number(decimals ?? 18))}{" "}
          {(symbol as string) ?? "shares"}
        </span>
      </p>

      <label className="mt-4 block text-sm">
        <span className="text-text-muted">Shares to redeem</span>
        <input
          type="number"
          min="0"
          step="any"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          className="mz-input mt-1"
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
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-text-secondary transition hover:border-btc-orange/40"
        >
          Max
        </button>
      </div>

      <button
        type="button"
        disabled={!address || waiting || !shares}
        onClick={handleWithdraw}
        className="mz-btn-secondary mt-4"
      >
        {waiting ? "Processing…" : "Withdraw"}
      </button>

      {status && <p className="mt-3 text-xs text-text-muted">{status}</p>}
    </div>
  );
}
