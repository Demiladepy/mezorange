import { ethers } from "hardhat";

/**
 * Mezo Testnet Uniswap V3 periphery addresses.
 * No official NPM/Router is documented for Mezo Testnet yet — replace these placeholders
 * after deploying or verifying Uniswap V3 on Mezo (chain ID 31611).
 *
 * Optional overrides via .env:
 *   NPM_ADDRESS, SWAP_ROUTER_ADDRESS, POOL_ADDRESS, DEPLOY_DIRECT_VAULT=true
 */
const MEZO_TESTNET_UNISWAP = {
  // TODO: replace with deployed NonfungiblePositionManager on Mezo Testnet
  nonfungiblePositionManager: process.env.NPM_ADDRESS ?? "0x0000000000000000000000000000000000000001",
  // TODO: replace with deployed SwapRouter on Mezo Testnet
  swapRouter: process.env.SWAP_ROUTER_ADDRESS ?? "0x0000000000000000000000000000000000000002",
};

const POOL_FEE = 3000;
const MOCK_MINT_AMOUNT = ethers.parseEther("1000000");
const DEPLOY_DIRECT_VAULT = process.env.DEPLOY_DIRECT_VAULT === "true";
const POOL_ADDRESS = process.env.POOL_ADDRESS ?? ethers.ZeroAddress;

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();

  console.log("Network:", network.name, `(chainId ${network.chainId})`);
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

  console.log("MezrangeVaultFactory:", factoryAddress);
  console.log("  NPM (placeholder):", MEZO_TESTNET_UNISWAP.nonfungiblePositionManager);
  console.log("  SwapRouter (placeholder):", MEZO_TESTNET_UNISWAP.swapRouter);

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

    await (await vault.setKeeper(deployer.address)).wait();

    console.log("MezrangeVault (direct):", vaultAddress);
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
