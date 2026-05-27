import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import {
  deployUniswapFixture,
  deployVault,
  equalDepositAmounts,
  approveVault,
  swapExactInput,
  addDeepPoolLiquidity,
  POOL_FEE,
  UniswapFixture,
} from "./helpers/uniswapFixture";

describe("MezrangeVault", function () {
  async function baseFixture() {
    const fixture = await deployUniswapFixture();
    const vault = await deployVault(fixture, 1); // RangeWidth.MEDIUM
    return { ...fixture, vault };
  }

  async function tightRangeFixture() {
    const fixture = await deployUniswapFixture();
    await addDeepPoolLiquidity(fixture);
    const vault = await deployVault(fixture, 0); // RangeWidth.TIGHT
    return { ...fixture, vault };
  }

  async function slippageFixture() {
    const fixture = await deployUniswapFixture();
    await addDeepPoolLiquidity(fixture);
    const mockRouter = await ethers.deployContract("MockSwapRouter", [await fixture.swapRouter.getAddress()]);
    const vault = await deployVault(fixture, 0, await mockRouter.getAddress());
    return { ...fixture, vault, mockRouter };
  }

  async function depositForUser(fixture: UniswapFixture & { vault: Awaited<ReturnType<typeof deployVault>> }) {
    const { amount0, amount1 } = await equalDepositAmounts(ethers.parseEther("1000"));
    await approveVault(fixture.vault, fixture.user, amount0);
    await (await fixture.vault.connect(fixture.user).depositDual(amount0, amount1, fixture.user.address)).wait();
    return { amount0, amount1 };
  }

  async function movePriceOutOfRange(
    fixture: UniswapFixture & { vault: Awaited<ReturnType<typeof deployVault>> }
  ) {
    let amount = ethers.parseEther("1000");
    for (let i = 0; i < 8; i++) {
      await swapExactInput(fixture, fixture.trader, fixture.token0, fixture.token1, amount);
      if (await fixture.vault.needsRebalance()) {
        return;
      }
      amount *= 2n;
    }
    throw new Error("unable to move pool price out of vault range");
  }

  // ── 1. Deployment ──────────────────────────────────────────────────────────

  describe("Deployment and initialization", function () {
    it("sets immutable tokens, pool, fee tier, and initial state", async function () {
      const { vault, token0, token1, pool, positionManager, swapRouter, keeper } =
        await loadFixture(baseFixture);

      expect(await vault.token0()).to.equal(await token0.getAddress());
      expect(await vault.token1()).to.equal(await token1.getAddress());
      expect(await vault.pool()).to.equal(await pool.getAddress());
      expect(await vault.poolFee()).to.equal(POOL_FEE);
      expect(await vault.positionManager()).to.equal(await positionManager.getAddress());
      expect(await vault.swapRouter()).to.equal(await swapRouter.getAddress());
      expect(await vault.positionTokenId()).to.equal(0n);
      expect(await vault.keeper()).to.equal(keeper.address);
      expect(await vault.paused()).to.equal(false);
      expect(await vault.totalSupply()).to.equal(0n);
    });

    it("uses token0 as the ERC-4626 underlying asset", async function () {
      const { vault, token0 } = await loadFixture(baseFixture);
      expect(await vault.asset()).to.equal(await token0.getAddress());
    });
  });

  // ── 2. Deposit ─────────────────────────────────────────────────────────────

  describe("Deposit", function () {
    it("mints shares and creates a Uniswap V3 position NFT", async function () {
      const { vault, user, positionManager } = await loadFixture(baseFixture);
      const { amount0, amount1 } = await equalDepositAmounts();
      await approveVault(vault, user, amount0);

      await expect(vault.connect(user).depositDual(amount0, amount1, user.address))
        .to.emit(vault, "Deposited")
        .withArgs(user.address, amount0, amount1, amount0 + amount1);

      const shares = await vault.balanceOf(user.address);
      expect(shares).to.be.gt(0n);

      const tokenId = await vault.positionTokenId();
      expect(tokenId).to.be.gt(0n);
      expect(await positionManager.ownerOf(tokenId)).to.equal(await vault.getAddress());

      const tickLower = await vault.tickLower();
      const tickUpper = await vault.tickUpper();
      expect(tickUpper).to.be.gt(tickLower);

      const pos = await positionManager.positions(tokenId);
      expect(pos.liquidity).to.be.gt(0n);
    });

    it("reverts on unequal deposit values", async function () {
      const { vault, user } = await loadFixture(baseFixture);
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("500");
      await approveVault(vault, user, amount0);

      await expect(vault.connect(user).depositDual(amount0, amount1, user.address))
        .to.be.revertedWithCustomError(vault, "UnequalDepositValue");
    });

    it("reverts when standard ERC-4626 deposit is used", async function () {
      const { vault, user } = await loadFixture(baseFixture);
      await expect(vault.connect(user).deposit(1, user.address))
        .to.be.revertedWithCustomError(vault, "UseDepositDual");
    });
  });

  // ── 3. Withdraw ────────────────────────────────────────────────────────────

  describe("Withdraw", function () {
    it("returns proportional tokens and earned fees", async function () {
      const fixture = await loadFixture(baseFixture);
      const { vault, user, trader, token0, token1 } = fixture;
      const { amount0 } = await depositForUser(fixture);

      const shares = await vault.balanceOf(user.address);

      await swapExactInput(fixture, trader, token0, token1, ethers.parseEther("10"));

      const bal0Before = await token0.balanceOf(user.address);
      const bal1Before = await token1.balanceOf(user.address);

      await expect(vault.connect(user).redeemDual(shares, user.address, user.address))
        .to.emit(vault, "Withdrawn");

      expect(await token0.balanceOf(user.address)).to.be.gt(bal0Before);
      expect(await token1.balanceOf(user.address)).to.be.gt(bal1Before);
      expect(await vault.balanceOf(user.address)).to.equal(0n);

      // User should recover roughly the deposit plus fee share (minus rounding).
      expect(await token0.balanceOf(user.address)).to.be.gte(amount0 - ethers.parseEther("1"));
    });
  });

  // ── 4. Rebalance ───────────────────────────────────────────────────────────

  describe("Rebalance trigger", function () {
    it("detects out-of-range price and re-centers the position", async function () {
      const fixture = await loadFixture(tightRangeFixture);
      const { vault, user, keeper, positionManager, pool } = fixture;

      const { amount0, amount1 } = await equalDepositAmounts(ethers.parseEther("10000"));
      await approveVault(vault, user, amount0);
      await (await vault.connect(user).depositDual(amount0, amount1, user.address)).wait();

      const oldTokenId = await vault.positionTokenId();
      const oldLower = await vault.tickLower();
      const oldUpper = await vault.tickUpper();

      expect(await vault.needsRebalance()).to.equal(false);

      await movePriceOutOfRange(fixture);
      expect(await vault.needsRebalance()).to.equal(true);

      await expect(vault.connect(keeper).rebalance()).to.emit(vault, "Rebalanced");

      const newTokenId = await vault.positionTokenId();
      expect(newTokenId).to.not.equal(oldTokenId);
      expect(newTokenId).to.be.gt(0n);

      const newLower = await vault.tickLower();
      const newUpper = await vault.tickUpper();
      expect(newLower).to.not.equal(oldLower);
      expect(newUpper).to.not.equal(oldUpper);

      const pos = await positionManager.positions(newTokenId);
      expect(pos.liquidity).to.be.gt(0n);

      const slot0 = await pool.slot0();
      expect(slot0.tick).to.be.gte(newLower);
      expect(slot0.tick).to.be.lte(newUpper);
      expect(await vault.needsRebalance()).to.equal(false);
    });

    it("reverts when rebalance is not needed", async function () {
      const { vault, keeper } = await loadFixture(baseFixture);
      await expect(vault.connect(keeper).rebalance()).to.be.revertedWithCustomError(
        vault,
        "RebalanceNotNeeded"
      );
    });
  });

  // ── 5. Emergency pause ─────────────────────────────────────────────────────

  describe("Emergency pause", function () {
    it("blocks deposit and rebalance while paused, then resumes", async function () {
      const { vault, user, keeper, deployer } = await loadFixture(baseFixture);
      const { amount0, amount1 } = await equalDepositAmounts();
      await approveVault(vault, user, amount0);

      await (await vault.connect(deployer).pause()).wait();
      expect(await vault.paused()).to.equal(true);

      await expect(vault.connect(user).depositDual(amount0, amount1, user.address)).to.be.revertedWithCustomError(
        vault,
        "EnforcedPause"
      );

      await expect(vault.connect(keeper).rebalance()).to.be.revertedWithCustomError(vault, "EnforcedPause");

      await (await vault.connect(deployer).unpause()).wait();

      await expect(vault.connect(user).depositDual(amount0, amount1, user.address)).to.not.be.reverted;
    });
  });

  // ── 6. Fee collection and compounding ──────────────────────────────────────

  describe("Fee collection and compounding", function () {
    it("emits FeesCompounded and reinvests on rebalance", async function () {
      const fixture = await loadFixture(tightRangeFixture);
      const { vault, user, keeper, positionManager } = fixture;

      const { amount0, amount1 } = await equalDepositAmounts(ethers.parseEther("20000"));
      await approveVault(vault, user, amount0);
      await (await vault.connect(user).depositDual(amount0, amount1, user.address)).wait();

      const oldTokenId = await vault.positionTokenId();

      for (let i = 0; i < 5; i++) {
        await swapExactInput(fixture, fixture.trader, fixture.token0, fixture.token1, ethers.parseEther("25"));
        await swapExactInput(fixture, fixture.trader, fixture.token1, fixture.token0, ethers.parseEther("25"));
      }

      await movePriceOutOfRange(fixture);
      expect(await vault.needsRebalance()).to.equal(true);

      const tx = await vault.connect(keeper).rebalance();
      await expect(tx).to.emit(vault, "FeesCompounded");

      expect(await vault.positionTokenId()).to.not.equal(oldTokenId);
      expect(await vault.needsRebalance()).to.equal(false);
    });
  });

  // ── 7. Slippage protection ─────────────────────────────────────────────────

  describe("Slippage protection", function () {
    it("reverts rebalance when swap slippage exceeds configured tolerance", async function () {
      const fixture = await loadFixture(slippageFixture);
      const { vault, user, keeper, mockRouter } = fixture;

      const { amount0, amount1 } = await equalDepositAmounts(ethers.parseEther("10000"));
      await approveVault(vault, user, amount0);
      await (await vault.connect(user).depositDual(amount0, amount1, user.address)).wait();

      await movePriceOutOfRange(fixture);
      expect(await vault.needsRebalance()).to.equal(true);

      await (await vault.setRebalanceSwapSlippageBps(100)).wait();
      await (await mockRouter.setSimulateSlippageFailure(true)).wait();

      await expect(vault.connect(keeper).rebalance()).to.be.revertedWith("STF");
    });

    it("allows rebalance when slippage protection is disabled", async function () {
      const fixture = await loadFixture(tightRangeFixture);
      const { vault, user, keeper } = fixture;

      const { amount0, amount1 } = await equalDepositAmounts(ethers.parseEther("10000"));
      await approveVault(vault, user, amount0);
      await (await vault.connect(user).depositDual(amount0, amount1, user.address)).wait();

      await movePriceOutOfRange(fixture);

      await expect(vault.connect(keeper).rebalance()).to.emit(vault, "Rebalanced");
    });
  });

  // ── 8. Access control ──────────────────────────────────────────────────────

  describe("Access control", function () {
    it("restricts rebalance to keeper", async function () {
      const { vault, user } = await loadFixture(baseFixture);
      await expect(vault.connect(user).rebalance()).to.be.revertedWithCustomError(
        vault,
        "UnauthorizedKeeper"
      );
    });

    it("restricts pause to owner", async function () {
      const { vault, user } = await loadFixture(baseFixture);
      await expect(vault.connect(user).pause()).to.be.revertedWithCustomError(
        vault,
        "OwnableUnauthorizedAccount"
      );
    });

    it("allows owner to update keeper", async function () {
      const { vault, deployer, user } = await loadFixture(baseFixture);
      await (await vault.connect(deployer).setKeeper(user.address)).wait();
      expect(await vault.keeper()).to.equal(user.address);
    });
  });
});
