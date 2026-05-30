import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import hre from "hardhat";

/** Mezo testnet Slipstream CL — https://mezo.org/docs/developers/features/mezo-pools/ */
const CL_FACTORY = "0x7B61BC8Aa460476d142F1CD107A47297002f69ff";
const MUSD = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";
const BTC = "0x7670000000000000000000000000000000000000";
const TICK_SPACING = 200;

/** 1 BTC = 70_000 MUSD → price token1/token0 (BTC/MUSD) = 1/70_000 */
const MUSD_PER_BTC = 70_000n;

const CL_FACTORY_ABI = [
  "function createPool(address tokenA, address tokenB, int24 tickSpacing, uint160 sqrtPriceX96) external returns (address pool)",
  "function getPool(address tokenA, address tokenB, int24 tickSpacing) external view returns (address pool)",
  "function poolImplementation() external view returns (address)",
  "event PoolCreated(address indexed token0, address indexed token1, int24 indexed tickSpacing, address pool)",
] as const;

const POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, bool unlocked)",
] as const;

/** Integer square root (floor) for BigInt. */
function isqrt(n: bigint): bigint {
  if (n < 0n) throw new Error("isqrt: negative input");
  if (n === 0n) return 0n;
  let x = n;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + n / x) / 2n;
  }
  return x;
}

/**
 * Uniswap V3 / Slipstream Q64.96: sqrtPriceX96 = floor(sqrt(token1/token0) * 2^96).
 * token0 = MUSD, token1 = BTC → token1/token0 = 1 / MUSD_PER_BTC.
 */
function computeSqrtPriceX96(musdPerBtc: bigint): bigint {
  const q96 = 2n ** 96n;
  // sqrt(1/musdPerBtc) * 2^96 = 2^96 / sqrt(musdPerBtc) = isqrt(2^192 / musdPerBtc)
  return isqrt((q96 * q96) / musdPerBtc);
}

/** OpenZeppelin Clones (EIP-1167) init code hash — salt = keccak256(abi.encode(token0, token1, tickSpacing)). */
function cloneInitCodeHash(implementation: string): string {
  const { getAddress, keccak256, solidityPacked } = hre.ethers;
  const initCode = solidityPacked(
    ["bytes", "address", "bytes"],
    ["0x3d602d80600a3d3981f3363d3d373d3d3d363d73", getAddress(implementation), "0x5af43d82803e903d91602b57fd5bf3"],
  );
  return keccak256(initCode);
}

function predictPoolAddress(
  factoryAddress: string,
  implementation: string,
  token0: string,
  token1: string,
  tickSpacing: number,
): string {
  const { AbiCoder, getAddress, getCreate2Address, keccak256 } = hre.ethers;
  const salt = keccak256(
    AbiCoder.defaultAbiCoder().encode(
      ["address", "address", "int24"],
      [getAddress(token0), getAddress(token1), tickSpacing],
    ),
  );
  return getCreate2Address(getAddress(factoryAddress), salt, cloneInitCodeHash(implementation));
}

function upsertEnvPoolAddress(rootDir: string, poolAddress: string) {
  const envPath = resolve(rootDir, ".env");
  const line = `POOL_ADDRESS=${poolAddress}`;
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `${line}\n`, "utf8");
    return;
  }
  const content = readFileSync(envPath, "utf8");
  if (/^POOL_ADDRESS=.*$/m.test(content)) {
    writeFileSync(envPath, content.replace(/^POOL_ADDRESS=.*$/m, line), "utf8");
  } else {
    const suffix = content.endsWith("\n") ? "" : "\n";
    writeFileSync(envPath, `${content}${suffix}${line}\n`, "utf8");
  }
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const { ethers } = hre;
  const getAddress = ethers.getAddress;

  const token0 = getAddress(MUSD);
  const token1 = getAddress(BTC);
  const sqrtPriceX96 = computeSqrtPriceX96(MUSD_PER_BTC);

  const privateKey = process.env.DEPLOYER_PRIVATE_KEY ?? process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("Set DEPLOYER_PRIVATE_KEY (or PRIVATE_KEY) in .env");
  }

  const wallet = new ethers.Wallet(privateKey, ethers.provider);
  const factory = new ethers.Contract(CL_FACTORY, CL_FACTORY_ABI, wallet);

  const implementation = await factory.poolImplementation();
  const predictedPool = predictPoolAddress(CL_FACTORY, implementation, token0, token1, TICK_SPACING);

  console.log("=== BTC/MUSD Slipstream CL pool creation (Mezo testnet) ===\n");
  console.log("Deployer:     ", wallet.address);
  console.log("CL Factory:   ", CL_FACTORY);
  console.log("token0 (MUSD):", token0);
  console.log("token1 (BTC): ", token1);
  console.log("tickSpacing:  ", TICK_SPACING);
  console.log("Price:        1 BTC =", MUSD_PER_BTC.toString(), "MUSD");
  console.log("              token1/token0 = 1 /", MUSD_PER_BTC.toString());
  console.log("sqrtPriceX96: ", sqrtPriceX96.toString());
  console.log("Pool impl:    ", implementation);
  console.log("Predicted pool (CREATE2):", predictedPool);

  const existing = await factory.getPool(token0, token1, TICK_SPACING);
  if (existing !== "0x0000000000000000000000000000000000000000") {
    console.log("\nPool already exists at:", existing);
    console.log("Skipping createPool tx. Updating .env POOL_ADDRESS.");
    upsertEnvPoolAddress(resolve(__dirname, ".."), existing);
    return;
  }

  // Cross-check prediction via eth_call
  const simulated = await factory.createPool.staticCall(token0, token1, TICK_SPACING, sqrtPriceX96);
  if (getAddress(simulated) !== getAddress(predictedPool)) {
    console.warn(
      "\nWarning: staticCall pool address differs from CREATE2 prediction:",
      simulated,
      "vs",
      predictedPool,
    );
  }

  console.log("\nAbout to send createPool tx. Press Ctrl+C to abort — sleeping 5s…");
  await sleep(5000);

  const tx = await factory.createPool(token0, token1, TICK_SPACING, sqrtPriceX96, {
    gasLimit: 3_000_000n,
  });
  console.log("\nTx submitted:", tx.hash);
  const receipt = await tx.wait();
  if (!receipt) throw new Error("Transaction failed (no receipt)");

  const iface = factory.interface;
  let poolFromLog: string | undefined;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CL_FACTORY.toLowerCase()) continue;
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "PoolCreated") {
        poolFromLog = parsed.args.pool as string;
        break;
      }
    } catch {
      // not PoolCreated
    }
  }

  const poolAddress = poolFromLog ?? predictedPool;

  console.log("\n=== Pool created ===");
  console.log("Tx hash:     ", receipt.hash);
  console.log("Block number:", receipt.blockNumber);
  console.log("Pool address:", poolAddress);

  const verified = await factory.getPool(token0, token1, TICK_SPACING);
  console.log("\ngetPool verify:", verified);
  if (getAddress(verified) !== getAddress(poolAddress)) {
    throw new Error("getPool verification failed");
  }

  const pool = new ethers.Contract(poolAddress, POOL_ABI, ethers.provider);
  const slot0 = await pool.slot0();
  console.log("\nPool slot0():");
  console.log("  sqrtPriceX96:", slot0.sqrtPriceX96.toString());
  console.log("  tick:        ", slot0.tick.toString());

  upsertEnvPoolAddress(resolve(__dirname, ".."), getAddress(poolAddress));
  console.log("\nSaved POOL_ADDRESS to .env");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
