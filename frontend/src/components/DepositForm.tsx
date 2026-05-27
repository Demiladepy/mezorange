"use client";

import { useState } from "react";
import {
  useAccount,
  useContractRead,
  useContractWrite,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits } from "viem";
import { erc20Abi, mezrangeVaultAbi } from "@/lib/abis";

type DepositFormProps = {
  vaultAddress: `0x${string}`;
};

export function DepositForm({ vaultAddress }: DepositFormProps) {
  const { address } = useAccount();
  const [amount0, setAmount0] = useState("");
  const [amount1, setAmount1] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const { data: token0 } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "token0",
  });

  const { data: token1 } = useContractRead({
    address: vaultAddress,
    abi: mezrangeVaultAbi,
    functionName: "token1",
  });

  const { data: decimals0 } = useContractRead({
    address: token0 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(token0) },
  });

  const { data: decimals1 } = useContractRead({
    address: token1 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "decimals",
    query: { enabled: Boolean(token1) },
  });

  const { data: symbol0 } = useContractRead({
    address: token0 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(token0) },
  });

  const { data: symbol1 } = useContractRead({
    address: token1 as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: "symbol",
    query: { enabled: Boolean(token1) },
  });

  const { writeContractAsync: approve0, data: approve0Hash } = useContractWrite();
  const { writeContractAsync: approve1, data: approve1Hash } = useContractWrite();
  const { writeContractAsync: deposit, data: depositHash } = useContractWrite();

  const { isLoading: waitingApprove0 } = useWaitForTransactionReceipt({
    hash: approve0Hash,
  });
  const { isLoading: waitingApprove1 } = useWaitForTransactionReceipt({
    hash: approve1Hash,
  });
  const { isLoading: waitingDeposit } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  const busy =
    waitingApprove0 || waitingApprove1 || waitingDeposit;

  async function handleDeposit() {
    if (!address || !token0 || !token1 || !decimals0 || !decimals1) return;

    try {
      setStatus("Approving tokens…");
      const parsed0 = parseUnits(amount0 || "0", Number(decimals0));
      const parsed1 = parseUnits(amount1 || "0", Number(decimals1));

      await approve0({
        address: token0 as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [vaultAddress, parsed0],
      });

      await approve1({
        address: token1 as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [vaultAddress, parsed1],
      });

      setStatus("Depositing…");
      await deposit({
        address: vaultAddress,
        abi: mezrangeVaultAbi,
        functionName: "depositDual",
        args: [parsed0, parsed1, address],
      });

      setStatus("Deposit confirmed.");
      setAmount0("");
      setAmount1("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Deposit failed.");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
      <h3 className="text-lg font-semibold text-zinc-50">Deposit</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Provide equal-value amounts of both pool tokens.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="text-zinc-400">{(symbol0 as string) ?? "Token0"}</span>
          <input
            type="number"
            min="0"
            step="any"
            value={amount0}
            onChange={(e) => setAmount0(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-orange-500"
            placeholder="0.0"
          />
        </label>
        <label className="block text-sm">
          <span className="text-zinc-400">{(symbol1 as string) ?? "Token1"}</span>
          <input
            type="number"
            min="0"
            step="any"
            value={amount1}
            onChange={(e) => setAmount1(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none focus:border-orange-500"
            placeholder="0.0"
          />
        </label>
      </div>

      <button
        type="button"
        disabled={!address || busy || !amount0 || !amount1}
        onClick={handleDeposit}
        className="mt-4 w-full rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Processing…" : "Approve & Deposit"}
      </button>

      {status && <p className="mt-3 text-xs text-zinc-400">{status}</p>}
    </div>
  );
}
