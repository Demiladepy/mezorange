import "dotenv/config";
import { Contract, JsonRpcProvider, Wallet, formatEther, parseUnits } from "ethers";

// ── Minimal ABIs ─────────────────────────────────────────────────────────────

const VAULT_ABI = [
  "function needsRebalance() view returns (bool)",
  "function rebalance()",
  "function keeper() view returns (address)",
  "function paused() view returns (bool)",
  "function pool() view returns (address)",
  "function positionTokenId() view returns (uint256)",
  "event Rebalanced(uint256 indexed oldTokenId, uint256 indexed newTokenId, int24 newTickLower, int24 newTickUpper)",
] as const;

const POOL_ABI = [
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
] as const;

// ── Config ───────────────────────────────────────────────────────────────────

interface KeeperConfig {
  rpcUrl: string;
  privateKey: string;
  vaultAddress: string;
  poolAddress: string;
  pollOnBlock: boolean;
  checkDebounceMs: number;
  rebalanceGasLimit: bigint;
  gasLimitBufferBps: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

function loadConfig(): KeeperConfig {
  const rpcUrl = process.env.TESTNET_RPC ?? "https://rpc.test.mezo.org";
  const privateKey = process.env.KEEPER_PRIVATE_KEY ?? process.env.PRIVATE_KEY ?? "";
  const vaultAddress = process.env.VAULT_ADDRESS ?? "";

  if (!privateKey) {
    throw new Error("KEEPER_PRIVATE_KEY (or PRIVATE_KEY) is required");
  }
  if (!vaultAddress) {
    throw new Error("VAULT_ADDRESS is required");
  }

  return {
    rpcUrl,
    privateKey,
    vaultAddress,
    poolAddress: process.env.POOL_ADDRESS ?? "",
    pollOnBlock: (process.env.POLL_ON_BLOCK ?? "true").toLowerCase() !== "false",
    checkDebounceMs: Number(process.env.CHECK_DEBOUNCE_MS ?? "3000"),
    rebalanceGasLimit: BigInt(process.env.REBALANCE_GAS_LIMIT ?? "1500000"),
    gasLimitBufferBps: BigInt(process.env.GAS_LIMIT_BUFFER_BPS ?? "2000"),
    maxFeePerGas: process.env.MAX_FEE_PER_GAS_GWEI
      ? parseUnits(process.env.MAX_FEE_PER_GAS_GWEI, "gwei")
      : undefined,
    maxPriorityFeePerGas: process.env.MAX_PRIORITY_FEE_PER_GAS_GWEI
      ? parseUnits(process.env.MAX_PRIORITY_FEE_PER_GAS_GWEI, "gwei")
      : undefined,
  };
}

// ── Logging ──────────────────────────────────────────────────────────────────

function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...data,
  };
  console.log(JSON.stringify(entry));
}

// ── Keeper ───────────────────────────────────────────────────────────────────

class MezrangeKeeper {
  private readonly config: KeeperConfig;
  private readonly provider: JsonRpcProvider;
  private readonly wallet: Wallet;
  private readonly vault: Contract;
  private pool!: Contract;

  private lastCheckedTick: number | null = null;
  private lastCheckAt = 0;
  private rebalanceInFlight = false;

  constructor(config: KeeperConfig) {
    this.config = config;
    this.provider = new JsonRpcProvider(config.rpcUrl, 31611);
    this.wallet = new Wallet(config.privateKey, this.provider);
    this.vault = new Contract(config.vaultAddress, VAULT_ABI, this.wallet);
  }

  async start(): Promise<void> {
    const network = await this.provider.getNetwork();
    const balance = await this.provider.getBalance(this.wallet.address);

    log("info", "keeper starting", {
      chainId: network.chainId.toString(),
      keeper: this.wallet.address,
      vault: this.config.vaultAddress,
      balanceBtc: formatEther(balance),
    });

    const onChainKeeper = await this.vault.keeper();
    if (onChainKeeper.toLowerCase() !== this.wallet.address.toLowerCase()) {
      throw new Error(`Wallet ${this.wallet.address} is not vault keeper (${onChainKeeper})`);
    }

    const poolAddress =
      this.config.poolAddress || (await this.vault.pool());
    this.pool = new Contract(poolAddress, POOL_ABI, this.provider);

    log("info", "watching pool", { pool: poolAddress });

    const slot0 = await this.pool.slot0();
    this.lastCheckedTick = Number(slot0.tick);
    log("info", "initial pool tick", { tick: this.lastCheckedTick });

    await this.evaluateRebalance("startup");

    this.pool.on(
      this.pool.filters.Swap(),
      async (_sender, _recipient, _amount0, _amount1, _sqrtPriceX96, _liquidity, tick, event) => {
        log("info", "Swap event", {
          tx: event.log.transactionHash,
          tick: Number(tick),
        });
        await this.onPriceChange(Number(tick), "swap-event");
      }
    );

    if (this.config.pollOnBlock) {
      this.provider.on("block", async (blockNumber) => {
        try {
          const current = await this.pool.slot0();
          const tick = Number(current.tick);
          if (this.lastCheckedTick !== tick) {
            log("info", "tick changed on new block", { blockNumber, tick });
            await this.onPriceChange(tick, "block-poll");
          }
        } catch (err) {
          log("error", "block poll failed", { blockNumber, error: String(err) });
        }
      });
    }

    log("info", "keeper running", {
      pollOnBlock: this.config.pollOnBlock,
      debounceMs: this.config.checkDebounceMs,
    });
  }

  private async onPriceChange(tick: number, source: string): Promise<void> {
    this.lastCheckedTick = tick;
    const now = Date.now();
    if (now - this.lastCheckAt < this.config.checkDebounceMs) {
      log("info", "debounced rebalance check", { source, tick });
      return;
    }
    this.lastCheckAt = now;
    await this.evaluateRebalance(source);
  }

  private async evaluateRebalance(trigger: string): Promise<void> {
    if (this.rebalanceInFlight) {
      log("info", "rebalance already in flight", { trigger });
      return;
    }

    const paused: boolean = await this.vault.paused();
    if (paused) {
      log("warn", "vault paused — skipping", { trigger });
      return;
    }

    const needs: boolean = await this.vault.needsRebalance();
    log("info", "needsRebalance check", { trigger, needsRebalance: needs });

    if (!needs) {
      return;
    }

    await this.executeRebalance(trigger);
  }

  private async executeRebalance(trigger: string): Promise<void> {
    this.rebalanceInFlight = true;

    try {
      const estimate = await this.vault.rebalance.estimateGas();
      const gasLimit =
        (estimate * (10_000n + this.config.gasLimitBufferBps)) / 10_000n >
        this.config.rebalanceGasLimit
          ? (estimate * (10_000n + this.config.gasLimitBufferBps)) / 10_000n
          : this.config.rebalanceGasLimit;

      const feeData = await this.provider.getFeeData();
      const maxFeePerGas = this.config.maxFeePerGas ?? feeData.maxFeePerGas ?? undefined;
      const maxPriorityFeePerGas =
        this.config.maxPriorityFeePerGas ?? feeData.maxPriorityFeePerGas ?? undefined;

      const gasPrice = maxFeePerGas ?? feeData.gasPrice ?? 0n;
      const estimatedCost = gasLimit * gasPrice;

      log("info", "profitability snapshot (gas only)", {
        trigger,
        estimatedGas: estimate.toString(),
        gasLimit: gasLimit.toString(),
        estimatedCostBtc: formatEther(estimatedCost),
        note: "Fee gain estimate skipped — rebalancing because needsRebalance is true",
      });

      const tx = await this.vault.rebalance({
        gasLimit,
        ...(maxFeePerGas ? { maxFeePerGas } : {}),
        ...(maxPriorityFeePerGas ? { maxPriorityFeePerGas } : {}),
      });

      log("info", "rebalance submitted", {
        trigger,
        txHash: tx.hash,
        gasLimit: gasLimit.toString(),
      });

      const receipt = await tx.wait();
      log("info", "rebalance confirmed", {
        txHash: receipt?.hash,
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
      });
    } catch (err) {
      log("error", "rebalance failed", { trigger, error: String(err) });
    } finally {
      this.rebalanceInFlight = false;
    }
  }
}

// ── Entrypoint ───────────────────────────────────────────────────────────────

async function main() {
  const config = loadConfig();
  const keeper = new MezrangeKeeper(config);
  await keeper.start();
}

main().catch((err) => {
  log("error", "keeper crashed", { error: String(err) });
  process.exit(1);
});
