import hre from "hardhat";

async function main() {
  const factoryAddr = "0x0ea249E5B63CdB72300C3d332E7776277B2DC315";
  const pool = "0xB34cAF03F2a326B3b7eBaCeed6295a39Be8D7139";
  const t0 = "0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503";
  const t1 = "0x7670000000000000000000000000000000000000";
  const npm = "0x9B753e11bFEd0D88F6e1D2777E3c7dac42F96062";
  const router = "0x3112908bB72ce9c26a321Eeb22EC8e051F3b6E6a";

  const [signer] = await hre.ethers.getSigners();
  const factory = await hre.ethers.getContractAt("MezrangeVaultFactory", factoryAddr);

  try {
    await factory.createVault.staticCall(
      t0,
      t1,
      200,
      pool,
      1,
      "Mezorange LP BTC-MUSD",
      "moLP",
      signer.address,
    );
    console.log("createVault staticCall: OK");
  } catch (e: unknown) {
    const err = e as { shortMessage?: string; message?: string; data?: string };
    console.error("createVault staticCall failed:", err.shortMessage ?? err.message);
    if (err.data) console.error("data:", err.data);
  }

  const Vault = await hre.ethers.getContractFactory("MezrangeVault");
  const deployTx = await Vault.getDeployTransaction(
    t0,
    t1,
    200,
    npm,
    router,
    pool,
    1,
    "Mezorange LP BTC-MUSD",
    "moLP",
  );
  console.log("initcode bytes:", (deployTx.data!.length - 2) / 2);

  try {
    const sent = await signer.sendTransaction({ ...deployTx, gasLimit: 8_000_000n });
    console.log("deploy tx:", sent.hash);
    const receipt = await sent.wait();
    console.log("status:", receipt?.status, "gasUsed:", receipt?.gasUsed?.toString());
  } catch (e: unknown) {
    const err = e as { shortMessage?: string; message?: string; receipt?: { status?: number } };
    console.error("vault deploy failed:", err.shortMessage ?? err.message);
  }
}

main().catch(console.error);
