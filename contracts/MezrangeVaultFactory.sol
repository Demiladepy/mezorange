// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MezrangeVault} from "./MezrangeVault.sol";
import {INonfungiblePositionManager} from "./interfaces/INonfungiblePositionManager.sol";
import {ISwapRouter} from "./interfaces/ISwapRouter.sol";
import {IUniswapV3Pool} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

/// @title MezrangeVaultFactory
/// @notice Deploys {MezrangeVault} instances for arbitrary token pairs and Slipstream tick spacings.
contract MezrangeVaultFactory {
    /// @dev Uniswap V3 NonfungiblePositionManager shared by all vaults from this factory.
    INonfungiblePositionManager public immutable positionManager;

    /// @dev Uniswap V3 SwapRouter shared by all vaults from this factory.
    ISwapRouter public immutable swapRouter;

    /// @dev All vaults deployed through this factory.
    address[] private _vaults;

    /// @notice Emitted when a new vault is deployed.
    /// @param vault Address of the new vault.
    /// @param token0 Lower-sorted pool token0.
    /// @param token1 Lower-sorted pool token1.
    /// @param tickSpacing Slipstream pool tick spacing.
    /// @param pool Slipstream CL pool used by the vault.
    /// @param creator Address that initiated deployment (receives vault ownership).
    event VaultCreated(
        address indexed vault,
        address indexed token0,
        address indexed token1,
        int24 tickSpacing,
        address pool,
        address creator
    );

    error ZeroAddress();

    /// @param positionManager_ Uniswap V3 NonfungiblePositionManager on Mezo Testnet.
    /// @param swapRouter_ Uniswap V3 SwapRouter on Mezo Testnet.
    constructor(INonfungiblePositionManager positionManager_, ISwapRouter swapRouter_) {
        if (address(positionManager_) == address(0) || address(swapRouter_) == address(0)) {
            revert ZeroAddress();
        }

        positionManager = positionManager_;
        swapRouter = swapRouter_;
    }

    /// @notice Deploy a new vault for a token pair and tick spacing.
    /// @param tokenA First token of the pair (sorted internally).
    /// @param tokenB Second token of the pair (sorted internally).
    /// @param tickSpacing Slipstream pool tick spacing (e.g. 200).
    /// @param pool Initialized Slipstream CL pool for the pair and tick spacing.
    /// @param rangeWidth Initial concentrated-liquidity range preset.
    /// @param name ERC-20 share token name.
    /// @param symbol ERC-20 share token symbol.
    /// @param keeper Keeper authorized to call {MezrangeVault.rebalance} (defaults to `msg.sender` if zero).
    /// @return vault Address of the deployed vault.
    function createVault(
        address tokenA,
        address tokenB,
        int24 tickSpacing,
        IUniswapV3Pool pool,
        MezrangeVault.RangeWidth rangeWidth,
        string calldata name,
        string calldata symbol,
        address keeper
    ) external returns (address vault) {
        if (address(pool) == address(0)) revert ZeroAddress();

        address keeper_ = keeper == address(0) ? msg.sender : keeper;

        MezrangeVault newVault = new MezrangeVault(
            tokenA,
            tokenB,
            tickSpacing,
            positionManager,
            swapRouter,
            pool,
            rangeWidth,
            name,
            symbol
        );

        newVault.setKeeper(keeper_);
        newVault.transferOwnership(msg.sender);

        vault = address(newVault);
        _vaults.push(vault);

        emit VaultCreated(
            vault,
            tokenA < tokenB ? tokenA : tokenB,
            tokenA < tokenB ? tokenB : tokenA,
            tickSpacing,
            address(pool),
            msg.sender
        );
    }

    /// @notice Number of vaults deployed by this factory.
    function vaultCount() external view returns (uint256) {
        return _vaults.length;
    }

    /// @notice Vault address at `index` in the deployment registry.
    function getVault(uint256 index) external view returns (address) {
        return _vaults[index];
    }

    /// @notice Full list of deployed vault addresses.
    function getAllVaults() external view returns (address[] memory) {
        return _vaults;
    }
}
