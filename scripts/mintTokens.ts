import { ethers } from "hardhat";

/**
 * Mint mock test tokens or transfer an existing balance to a recipient.
 *
 * Environment variables:
 *   TOKEN_A_ADDRESS, TOKEN_B_ADDRESS — mock token addresses (from deploy.ts output)
 *   RECIPIENT — address to receive tokens (defaults to deployer)
 *   AMOUNT — human-readable amount per token, 18 decimals (default: 10000)
 *   TRANSFER_ONLY — if "true", skip mint and only transfer from deployer balance
 *
 * Mezo Testnet native BTC (gas):
 *   Request from the official Mezo faucet — https://mezo.org (see developer docs).
 *   MUSD is minted via borrow at https://mezo.org/feature/borrow, not a faucet.
 *
 * Usage:
 *   npx hardhat run scripts/mintTokens.ts --network mezoTestnet
 *   RECIPIENT=0xabc... AMOUNT=5000 npx hardhat run scripts/mintTokens.ts --network localhost
 */

const MEZO_FAUCET_URL = "https://mezo.org";
const MEZO_TESTNET_MUSD = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";

async function main() {
  const [deployer] = await ethers.getSigners();
  const recipient = process.env.RECIPIENT ?? deployer.address;
  const amountHuman = process.env.AMOUNT ?? "10000";
  const amount = ethers.parseEther(amountHuman);
  const transferOnly = process.env.TRANSFER_ONLY === "true";

  const tokenAAddress = process.env.TOKEN_A_ADDRESS;
  const tokenBAddress = process.env.TOKEN_B_ADDRESS;

  console.log("Network:", (await ethers.provider.getNetwork()).chainId);
  console.log("Deployer:", deployer.address);
  console.log("Recipient:", recipient);
  console.log("Amount per token:", amountHuman);
  console.log("Mode:", transferOnly ? "transfer only" : "mint (owner) + optional transfer");
  console.log("\nMezo Testnet BTC faucet:", MEZO_FAUCET_URL);
  console.log("Mezo Testnet MUSD (borrow, not faucet):", MEZO_TESTNET_MUSD);
  console.log("");

  if (!tokenAAddress || !tokenBAddress) {
    console.error("Set TOKEN_A_ADDRESS and TOKEN_B_ADDRESS in .env (from deploy.ts output).");
    process.exitCode = 1;
    return;
  }

  const tokenA = await ethers.getContractAt("MockToken", tokenAAddress);
  const tokenB = await ethers.getContractAt("MockToken", tokenBAddress);

  if (!transferOnly) {
    console.log("Minting mock tokens...");
    await (await tokenA.mint(recipient, amount)).wait();
    await (await tokenB.mint(recipient, amount)).wait();
    console.log("Minted", amountHuman, "MCKA and MCKB to", recipient);
  } else {
    console.log("Transferring from deployer balance...");
    await (await tokenA.transfer(recipient, amount)).wait();
    await (await tokenB.transfer(recipient, amount)).wait();
    console.log("Transferred", amountHuman, "MCKA and MCKB to", recipient);
  }

  const balA = await tokenA.balanceOf(recipient);
  const balB = await tokenB.balanceOf(recipient);

  console.log("\nRecipient balances:");
  console.log("  MCKA:", ethers.formatEther(balA));
  console.log("  MCKB:", ethers.formatEther(balB));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
