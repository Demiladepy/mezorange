import { ethers } from "hardhat";

/**
 * Mezo Testnet Uniswap V3 periphery addresses.
 * No official NPM/Router is documented for Mezo Testnet yet — replace these placeholders
 * after deploying or verifying Uniswap V3 on Mezo (chain ID 31611).
 *
 * Optional overrides via .env:
 *   NPM_ADDRESS, SWAP_ROUTER_ADDRESS, POOL_ADDRESS, DEPLOY_DIRECT_VAULT=true
 */
/** Official Mezo Testnet Slipstream (CL) addresses — https://mezo.org/docs/developers/features/mezo-pools/ */
const MEZO_TESTNET_SLIPSTREAM = {
  clFactory: "0x7B61BC8Aa460476d142F1CD107A47297002f69ff",
  nonfungiblePositionManager: "0x9B753e11bFEd0D88F6e1D2777E3c7dac42F96062",
  swapRouter: "0x3112908bB72ce9c26a321Eeb22EC8e051F3b6E6a",
};

const MEZO_TESTNET_UNISWAP = {
  nonfungiblePositionManager:
    process.env.NPM_ADDRESS ?? MEZO_TESTNET_SLIPSTREAM.nonfungiblePositionManager,
  swapRouter: process.env.SWAP_ROUTER_ADDRESS ?? MEZO_TESTNET_SLIPSTREAM.swapRouter,
};

const POOL_FEE = 3000;
const MOCK_MINT_AMOUNT = ethers.parseEther("1000000");
const DEPLOY_DIRECT_VAULT = process.env.DEPLOY_DIRECT_VAULT === "true";
const POOL_ADDRESS = process.env.POOL_ADDRESS ?? ethers.ZeroAddress;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Network:", network.name, `(chainId ${network.chainId})`);
  if (!deployer) {
    throw new Error(
      "No deployer account available. Set PRIVATE_KEY in .env for --network mezoTestnet (or use Hardhat local network).",
    );
  }
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(await ethers.provider.getBalance(deployer.address)),
    "BTC\n"
  );

  // ── Mock ERC-20 pair ──────────────────────────────────────────────────────
  const MockToken = await ethers.getContractFactory("MockToken");
  const tokenA = await MockToken.deploy("Mock Token A", "MCKA");
  const tokenB = await MockToken.deploy("Mock Token B", "MCKB");
  await tokenA.waitForDeployment();
  await tokenB.waitForDeployment();

  const tokenAAddress = await tokenA.getAddress();
  const tokenBAddress = await tokenB.getAddress();

  await (await tokenA.mint(deployer.address, MOCK_MINT_AMOUNT)).wait();
  await (await tokenB.mint(deployer.address, MOCK_MINT_AMOUNT)).wait();

  console.log("MockToken A (MCKA):", tokenAAddress);
  console.log("MockToken B (MCKB):", tokenBAddress);
  console.log("Minted per token:", ethers.formatEther(MOCK_MINT_AMOUNT), "to deployer\n");

  // ── Vault factory ─────────────────────────────────────────────────────────
  const Factory = await ethers.getContractFactory("MezrangeVaultFactory");
  const factory = await Factory.deploy(
    MEZO_TESTNET_UNISWAP.nonfungiblePositionManager,
    MEZO_TESTNET_UNISWAP.swapRouter
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  const factoryDeployReceipt = await factory.deploymentTransaction()?.wait();

  console.log("MezrangeVaultFactory:", factoryAddress);
  console.log("  CL Factory (Slipstream):", MEZO_TESTNET_SLIPSTREAM.clFactory);
  console.log("  NPM:", MEZO_TESTNET_UNISWAP.nonfungiblePositionManager);
  console.log("  SwapRouter:", MEZO_TESTNET_UNISWAP.swapRouter);
  if (factoryDeployReceipt) {
    console.log("  Deploy tx:", factoryDeployReceipt.hash);
    console.log("  Start block:", factoryDeployReceipt.blockNumber);
  }

  let vaultAddress = ethers.ZeroAddress;

  if (POOL_ADDRESS === ethers.ZeroAddress) {
    console.log("\nPOOL_ADDRESS not set — skipping vault deployment.");
    console.log("Set POOL_ADDRESS in .env to an initialized Uniswap V3 pool for your mock pair.");
  } else if (DEPLOY_DIRECT_VAULT) {
    console.log("\nDeploying single MezrangeVault directly (DEPLOY_DIRECT_VAULT=true)...");

    const Vault = await ethers.getContractFactory("MezrangeVault");
    const vault = await Vault.deploy(
      tokenAAddress,
      tokenBAddress,
      POOL_FEE,
      MEZO_TESTNET_UNISWAP.nonfungiblePositionManager,
      MEZO_TESTNET_UNISWAP.swapRouter,
      POOL_ADDRESS,
      1, // RangeWidth.MEDIUM
      "Mezrange Vault MCKA-MCKB",
      "mzMCK"
    );
    await vault.waitForDeployment();
    vaultAddress = await vault.getAddress();
    const vaultDeployReceipt = await vault.deploymentTransaction()?.wait();

    await (await vault.setKeeper(deployer.address)).wait();

    console.log("MezrangeVault (direct):", vaultAddress);
    if (vaultDeployReceipt) {
      console.log("  Deploy tx:", vaultDeployReceipt.hash);
      console.log("  Start block:", vaultDeployReceipt.blockNumber);
    }
    console.log("  Keeper:", deployer.address);
  } else {
    console.log("\nCreating vault via factory...");

    const tx = await factory.createVault(
      tokenAAddress,
      tokenBAddress,
      POOL_FEE,
      POOL_ADDRESS,
      1, // RangeWidth.MEDIUM
      "Mezrange Vault MCKA-MCKB",
      "mzMCK",
      deployer.address
    );
    const receipt = await tx.wait();
    vaultAddress = await factory.getVault(0);

    console.log("MezrangeVault (via factory):", vaultAddress);
    console.log("  Tx:", receipt?.hash);
    if (receipt) {
      console.log("  Start block:", receipt.blockNumber);
    }
    console.log("  Keeper:", deployer.address);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log("\n=== Deployment summary ===");
  console.log("Factory:   ", factoryAddress);
  console.log("Token A:   ", tokenAAddress);
  console.log("Token B:   ", tokenBAddress);
  console.log("Vault:     ", vaultAddress);
  console.log("\nSave these addresses in .env for scripts/mintTokens.ts:");
  console.log(`TOKEN_A_ADDRESS=${tokenAAddress}`);
  console.log(`TOKEN_B_ADDRESS=${tokenBAddress}`);
  if (vaultAddress !== ethers.ZeroAddress) {
    console.log(`VAULT_ADDRESS=${vaultAddress}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
