import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { Contract } from "ethers";

import UniswapV3FactoryArtifact from "@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json";
import SwapRouterArtifact from "@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json";
import NFTDescriptorArtifact from "@uniswap/v3-periphery/artifacts/contracts/libraries/NFTDescriptor.sol/NFTDescriptor.json";
import NonfungibleTokenPositionDescriptorArtifact from "@uniswap/v3-periphery/artifacts/contracts/NonfungibleTokenPositionDescriptor.sol/NonfungibleTokenPositionDescriptor.json";
import NonfungiblePositionManagerArtifact from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";

export const POOL_FEE = 3000;
export const SQRT_PRICE_1_1 = 79228162514264337593543950336n; // tick 0, 1:1 price

export interface UniswapFixture {
  deployer: SignerWithAddress;
  user: SignerWithAddress;
  keeper: SignerWithAddress;
  trader: SignerWithAddress;
  weth9: Contract;
  factory: Contract;
  swapRouter: Contract;
  positionManager: Contract;
  token0: Contract;
  token1: Contract;
  pool: Contract;
}

type LinkReferences = Record<string, Record<string, Array<{ start: number; length: number }>>>;

function linkLibraries(
  artifact: { bytecode: string; linkReferences?: LinkReferences },
  libraries: Record<string, string>
): string {
  let bytecode = artifact.bytecode;
  const linkReferences = artifact.linkReferences ?? {};

  for (const fileName of Object.keys(linkReferences)) {
    for (const contractName of Object.keys(linkReferences[fileName])) {
      if (!(contractName in libraries)) {
        throw new Error(`Missing link library: ${contractName}`);
      }
      const address = ethers.getAddress(libraries[contractName]).toLowerCase().slice(2);
      for (const { start, length } of linkReferences[fileName][contractName]) {
        const start2 = 2 + start * 2;
        const length2 = length * 2;
        bytecode = bytecode.slice(0, start2) + address + bytecode.slice(start2 + length2);
      }
    }
  }

  return bytecode;
}

export function encodePriceSqrt(amount1: bigint, amount0: bigint): bigint {
  if (amount0 === 0n) throw new Error("amount0 is zero");
  const ratioX192 = (amount1 << 192n) / amount0;
  return sqrtBigInt(ratioX192);
}

function sqrtBigInt(value: bigint): bigint {
  if (value < 0n) throw new Error("sqrt negative");
  if (value < 2n) return value;
  let x = value;
  let y = (x + 1n) >> 1n;
  while (y < x) {
    x = y;
    y = (x + value / x) >> 1n;
  }
  return x;
}

export async function deployUniswapFixture(): Promise<UniswapFixture> {
  const [deployer, user, keeper, trader] = await ethers.getSigners();

  const weth9 = await ethers.deployContract("WETH9");

  const factoryFactory = new ethers.ContractFactory(
    UniswapV3FactoryArtifact.abi,
    UniswapV3FactoryArtifact.bytecode,
    deployer
  );
  const factory = await factoryFactory.deploy();
  await factory.waitForDeployment();

  const swapRouterFactory = new ethers.ContractFactory(
    SwapRouterArtifact.abi,
    SwapRouterArtifact.bytecode,
    deployer
  );
  const swapRouter = await swapRouterFactory.deploy(
    await factory.getAddress(),
    await weth9.getAddress()
  );
  await swapRouter.waitForDeployment();

  const nftDescriptorLibFactory = new ethers.ContractFactory(
    NFTDescriptorArtifact.abi,
    NFTDescriptorArtifact.bytecode,
    deployer
  );
  const nftDescriptorLib = await nftDescriptorLibFactory.deploy();
  await nftDescriptorLib.waitForDeployment();
  const nftDescriptorAddress = await nftDescriptorLib.getAddress();

  const linkedDescriptorBytecode = linkLibraries(NonfungibleTokenPositionDescriptorArtifact, {
    NFTDescriptor: nftDescriptorAddress,
  });

  const positionDescriptorFactory = new ethers.ContractFactory(
    NonfungibleTokenPositionDescriptorArtifact.abi,
    linkedDescriptorBytecode,
    deployer
  );
  const nativeLabel = ethers.encodeBytes32String("ETH");
  const positionDescriptor = await positionDescriptorFactory.deploy(
    await weth9.getAddress(),
    nativeLabel
  );
  await positionDescriptor.waitForDeployment();

  const npmFactory = new ethers.ContractFactory(
    NonfungiblePositionManagerArtifact.abi,
    NonfungiblePositionManagerArtifact.bytecode,
    deployer
  );
  const positionManager = await npmFactory.deploy(
    await factory.getAddress(),
    await weth9.getAddress(),
    await positionDescriptor.getAddress()
  );
  await positionManager.waitForDeployment();

  const MockToken = await ethers.getContractFactory("MockToken");
  const tokenA = await MockToken.deploy("Token A", "TKA");
  const tokenB = await MockToken.deploy("Token B", "TKB");
  await tokenA.waitForDeployment();
  await tokenB.waitForDeployment();

  let token0Address = await tokenA.getAddress();
  let token1Address = await tokenB.getAddress();
  let token0 = tokenA;
  let token1 = tokenB;
  if (token0Address.toLowerCase() > token1Address.toLowerCase()) {
    [token0, token1] = [token1, token0];
    [token0Address, token1Address] = [token1Address, token0Address];
  }

  const mintAmount = ethers.parseEther("10000000");
  for (const signer of [deployer, user, trader]) {
    await (await token0.mint(signer.address, mintAmount)).wait();
    await (await token1.mint(signer.address, mintAmount)).wait();
  }

  await (
    await positionManager.createAndInitializePoolIfNecessary(
      token0Address,
      token1Address,
      POOL_FEE,
      SQRT_PRICE_1_1
    )
  ).wait();

  const poolAddress = await factory.getPool(token0Address, token1Address, POOL_FEE);
  const pool = await ethers.getContractAt(
    "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol:IUniswapV3Pool",
    poolAddress
  );

  return {
    deployer,
    user,
    keeper,
    trader,
    weth9,
    factory,
    swapRouter,
    positionManager,
    token0,
    token1,
    pool,
  };
}

export async function deployVault(
  fixture: UniswapFixture,
  rangeWidth: number = 1,
  swapRouterOverride?: string
) {
  const Vault = await ethers.getContractFactory("MezrangeVault");
  const vault = await Vault.deploy(
    await fixture.token0.getAddress(),
    await fixture.token1.getAddress(),
    POOL_FEE,
    await fixture.positionManager.getAddress(),
    swapRouterOverride ?? (await fixture.swapRouter.getAddress()),
    await fixture.pool.getAddress(),
    rangeWidth,
    "Mezrange Test Vault",
    "mzTEST"
  );
  await vault.waitForDeployment();
  await (await vault.setKeeper(fixture.keeper.address)).wait();
  return vault;
}

export async function equalDepositAmounts(
  amount: bigint = ethers.parseEther("1000")
): Promise<{ amount0: bigint; amount1: bigint }> {
  return { amount0: amount, amount1: amount };
}

export async function approveVault(vault: Contract, user: SignerWithAddress, amount: bigint) {
  const token0 = await ethers.getContractAt("MockToken", await vault.token0());
  const token1 = await ethers.getContractAt("MockToken", await vault.token1());
  await (await token0.connect(user).approve(await vault.getAddress(), amount)).wait();
  await (await token1.connect(user).approve(await vault.getAddress(), amount)).wait();
}

export async function swapExactInput(
  fixture: UniswapFixture,
  signer: SignerWithAddress,
  tokenIn: Contract,
  tokenOut: Contract,
  amountIn: bigint
) {
  await (await tokenIn.connect(signer).approve(await fixture.swapRouter.getAddress(), amountIn)).wait();
  const deadline = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
  await (
    await fixture.swapRouter.connect(signer).exactInputSingle({
      tokenIn: await tokenIn.getAddress(),
      tokenOut: await tokenOut.getAddress(),
      fee: POOL_FEE,
      recipient: signer.address,
      deadline,
      amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    })
  ).wait();
}

export async function addDeepPoolLiquidity(fixture: UniswapFixture, amount: bigint = ethers.parseEther("500000")) {
  const { positionManager, token0, token1, trader } = fixture;
  await (await token0.mint(trader.address, amount)).wait();
  await (await token1.mint(trader.address, amount)).wait();
  await (await token0.connect(trader).approve(await positionManager.getAddress(), amount)).wait();
  await (await token1.connect(trader).approve(await positionManager.getAddress(), amount)).wait();

  const deadline = (await ethers.provider.getBlock("latest"))!.timestamp + 3600;
  await (
    await positionManager.connect(trader).mint({
      token0: await token0.getAddress(),
      token1: await token1.getAddress(),
      fee: POOL_FEE,
      tickLower: -887220,
      tickUpper: 887220,
      amount0Desired: amount,
      amount1Desired: amount,
      amount0Min: 0,
      amount1Min: 0,
      recipient: trader.address,
      deadline,
    })
  ).wait();
}

export async function getPositionLiquidity(
  positionManager: Contract,
  tokenId: bigint
): Promise<bigint> {
  const pos = await positionManager.positions(tokenId);
  return pos.liquidity;
}
