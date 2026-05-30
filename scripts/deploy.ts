import { ethers } from "hardhat";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";

/**
 * Deploy Mezorange LP vault on Mezo Testnet (Slipstream CL).
 *
 * .env:
 *   PRIVATE_KEY or DEPLOYER_PRIVATE_KEY
 *   POOL_ADDRESS (from npm run create-pool:mezo)
 *
 * Optional:
 *   FACTORY_ADDRESS — deploy via factory instead of direct (needs ~6M+ gas)
 *   DEPLOY_DIRECT_VAULT=false — use factory.createVault (default: direct deploy)
 *   NPM_ADDRESS, SWAP_ROUTER_ADDRESS, TICK_SPACING=200
 */
const MEZO_TESTNET_SLIPSTREAM = {
  nonfungiblePositionManager: "0x9B753e11bFEd0D88F6e1D2777E3c7dac42F96062",
  swapRouter: "0x3112908bB72ce9c26a321Eeb22EC8e051F3b6E6a",
};

const MEZO_TESTNET = {
  nonfungiblePositionManager:
    process.env.NPM_ADDRESS ?? MEZO_TESTNET_SLIPSTREAM.nonfungiblePositionManager,
  swapRouter: process.env.SWAP_ROUTER_ADDRESS ?? MEZO_TESTNET_SLIPSTREAM.swapRouter,
};

const POOL_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function tickSpacing() view returns (int24)",
] as const;

const TICK_SPACING = Number(process.env.TICK_SPACING ?? "200");
const DEPLOY_DIRECT_VAULT = process.env.DEPLOY_DIRECT_VAULT !== "false";
const POOL_ADDRESS = process.env.POOL_ADDRESS ?? ethers.ZeroAddress;
const EXISTING_FACTORY = process.env.FACTORY_ADDRESS as string | undefined;

function upsertEnv(key: string, value: string) {
  const envPath = resolve(__dirname, "..", ".env");
  const line = `${key}=${value}`;
  if (!existsSync(envPath)) {
    writeFileSync(envPath, `${line}\n`, "utf8");
    return;
  }
  const content = readFileSync(envPath, "utf8");
  const re = new RegExp(`^${key}=.*$`, "m");
  writeFileSync(
    envPath,
    re.test(content) ? content.replace(re, line) : `${content.replace(/\n?$/, "\n")}${line}\n`,
    "utf8",
  );
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  if (!deployer) throw new Error("Set PRIVATE_KEY in .env");
  console.log("Network:", network.name, `(chainId ${network.chainId})`);
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "BTC\n",
  );

  if (POOL_ADDRESS === ethers.ZeroAddress) {
    throw new Error("POOL_ADDRESS not set. Run: npm run create-pool:mezo");
  }

  const pool = new ethers.Contract(POOL_ADDRESS, POOL_ABI, ethers.provider);
  const token0 = await pool.token0();
  const token1 = await pool.token1();
  const poolTickSpacing = Number(await pool.tickSpacing());

  console.log("=== Target CL pool ===");
  console.log("Pool:        ", POOL_ADDRESS);
  console.log("token0:      ", token0);
  console.log("token1:      ", token1);
  console.log("tickSpacing: ", poolTickSpacing);

  let factoryAddress = EXISTING_FACTORY ?? ethers.ZeroAddress;
  let vaultAddress = ethers.ZeroAddress;

  if (DEPLOY_DIRECT_VAULT) {
    console.log("\nDeploying MezrangeVault directly (recommended on Mezo — high gas)...");
    const Vault = await ethers.getContractFactory("MezrangeVault");
    const vault = await Vault.deploy(
      token0,
      token1,
      poolTickSpacing,
      MEZO_TESTNET.nonfungiblePositionManager,
      MEZO_TESTNET.swapRouter,
      POOL_ADDRESS,
      1,
      "Mezorange LP BTC-MUSD",
      "moLP",
      { gasLimit: 8_000_000n },
    );
    await vault.waitForDeployment();
    vaultAddress = await vault.getAddress();
    const receipt = await vault.deploymentTransaction()?.wait();
    await (await vault.setKeeper(deployer.address)).wait();
    console.log("MezrangeVault:", vaultAddress);
    if (receipt) {
      console.log("  Deploy tx:", receipt.hash);
      console.log("  Start block:", receipt.blockNumber);
      console.log("  Gas used:", receipt.gasUsed.toString());
    }
    console.log("  Keeper:", deployer.address);
  } else {
    if (!EXISTING_FACTORY) {
      const Factory = await ethers.getContractFactory("MezrangeVaultFactory");
      const factory = await Factory.deploy(
        MEZO_TESTNET.nonfungiblePositionManager,
        MEZO_TESTNET.swapRouter,
      );
      await factory.waitForDeployment();
      factoryAddress = await factory.getAddress();
      console.log("MezrangeVaultFactory (new):", factoryAddress);
    } else {
      console.log("Using factory:", factoryAddress);
    }

    const factory = await ethers.getContractAt("MezrangeVaultFactory", factoryAddress);
    const tx = await factory.createVault(
      token0,
      token1,
      poolTickSpacing,
      POOL_ADDRESS,
      1,
      "Mezorange LP BTC-MUSD",
      "moLP",
      deployer.address,
      { gasLimit: 8_000_000n },
    );
    const receipt = await tx.wait();
    const count = await factory.vaultCount();
    vaultAddress = await factory.getVault(count - 1n);
    console.log("MezrangeVault (via factory):", vaultAddress);
    console.log("  Tx:", receipt?.hash);
    if (receipt) console.log("  Start block:", receipt.blockNumber);
  }

  upsertEnv("VAULT_ADDRESS", vaultAddress);
  if (factoryAddress !== ethers.ZeroAddress) {
    upsertEnv("FACTORY_ADDRESS", factoryAddress);
  }

  console.log("\n=== Done ===");
  console.log("Vault:", vaultAddress);
  console.log("\nAdd to frontend/.env.local:");
  if (factoryAddress !== ethers.ZeroAddress) {
    console.log(`NEXT_PUBLIC_FACTORY_ADDRESS=${factoryAddress}`);
  }
  console.log(`NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
