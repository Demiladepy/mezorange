// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import {INonfungiblePositionManager} from "./interfaces/INonfungiblePositionManager.sol";
import {ISwapRouter} from "./interfaces/ISwapRouter.sol";
import {IUniswapV3Pool} from "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

import {TickMath} from "./libraries/TickMath.sol";
import {LiquidityAmounts} from "./libraries/LiquidityAmounts.sol";
import {FullMath} from "./libraries/FullMath.sol";
import {FixedPoint96} from "./libraries/FixedPoint96.sol";

/// @title MezrangeVault
/// @notice ERC-4626 vault that manages a single Velodrome Slipstream CL position for a token pair.
/// @dev Deposits require equal-value amounts of token0 and token1. Shares represent pro-rata ownership of the
///      position plus idle balances. A keeper may call {rebalance} when {needsRebalance} is true.
contract MezrangeVault is ERC4626, Ownable, ReentrancyGuard, Pausable, IERC721Receiver {
    using SafeERC20 for IERC20;
    using Math for uint256;

    /// @notice Preset half-widths (in ticks) for the active Uniswap V3 position.
    enum RangeWidth {
        TIGHT,
        MEDIUM,
        WIDE
    }

    /// @dev Slipstream NonfungiblePositionManager (Mezo address supplied at deployment).
    INonfungiblePositionManager public immutable positionManager;

    /// @dev Slipstream CLSwapRouter used during rebalances to reach the mint ratio.
    ISwapRouter public immutable swapRouter;

    /// @dev Target Slipstream CL pool for the pair and tick spacing.
    IUniswapV3Pool public immutable pool;

    /// @dev Sorted pool tokens (token0 < token1).
    IERC20 public immutable token0;
    IERC20 public immutable token1;

    /// @dev Pool tick spacing (Slipstream pool key); position ticks must align to this.
    int24 public immutable tickSpacing;

    /// @dev Basis-point denominator (10_000 = 100%).
    uint256 public constant BPS = 10_000;

    /// @dev Maximum allowed deviation between token legs on deposit (1% = 100 bps).
    uint256 public constant DEPOSIT_TOLERANCE_BPS = 100;

    /// @dev Default rebalance warning margin as a fraction of range width (5% = 500 bps).
    uint256 public constant DEFAULT_REBALANCE_THRESHOLD_BPS = 500;

    /// @dev Half-range width in ticks for each preset.
    uint256 private constant TIGHT_HALF_RANGE = 600;
    uint256 private constant MEDIUM_HALF_RANGE = 3000;
    uint256 private constant WIDE_HALF_RANGE = 10_000;

    /// @notice Active Uniswap V3 position NFT id (0 when none).
    uint256 public positionTokenId;

    /// @notice Lower tick of the active position.
    int24 public tickLower;

    /// @notice Upper tick of the active position.
    int24 public tickUpper;

    /// @notice Selected range preset for new positions and rebalances.
    RangeWidth public rangeWidth;

    /// @notice Distance from a range edge (as bps of total range width) that triggers {needsRebalance}.
    uint256 public rebalanceThresholdBps;

    /// @notice Address authorized to call {rebalance}.
    address public keeper;

    /// @notice Max slippage tolerated on rebalance swaps (bps). 0 disables min-out checks.
    uint256 public rebalanceSwapSlippageBps;

    /// @notice Emitted when a user deposits both pool tokens and receives vault shares.
    event Deposited(address indexed user, uint256 amount0, uint256 amount1, uint256 shares);

    /// @notice Emitted when a user burns vault shares and receives both pool tokens.
    event Withdrawn(address indexed user, uint256 amount0, uint256 amount1, uint256 shares);

    /// @notice Emitted after liquidity is moved to a new range-centered position.
    event Rebalanced(
        uint256 indexed oldTokenId,
        uint256 indexed newTokenId,
        int24 newTickLower,
        int24 newTickUpper
    );

    /// @notice Emitted when accrued Uniswap fees are collected into the vault (typically before compounding).
    event FeesCompounded(uint256 amount0, uint256 amount1);

    error ZeroAddress();
    error ZeroAmount();
    error UnauthorizedKeeper();
    error RebalanceNotNeeded();
    error UseDepositDual();
    error InvalidTokenOrder();
    error UnequalDepositValue();
    error InvalidRangeWidth();

    /// @param tokenA_ First token of the pair (sorted internally).
    /// @param tokenB_ Second token of the pair (sorted internally).
    /// @param tickSpacing_ Slipstream pool tick spacing (e.g. 200 for BTC/MUSD volatile).
    /// @param positionManager_ Slipstream NonfungiblePositionManager on Mezo.
    /// @param swapRouter_ Slipstream CLSwapRouter for rebalance swaps.
    /// @param pool_ Initialized Slipstream CL pool for the pair and tick spacing.
    /// @param rangeWidth_ Initial tick range preset.
    /// @param name_ ERC-20 share token name.
    /// @param symbol_ ERC-20 share token symbol.
    constructor(
        address tokenA_,
        address tokenB_,
        int24 tickSpacing_,
        INonfungiblePositionManager positionManager_,
        ISwapRouter swapRouter_,
        IUniswapV3Pool pool_,
        RangeWidth rangeWidth_,
        string memory name_,
        string memory symbol_
    ) ERC20(name_, symbol_) ERC4626(IERC20(tokenA_ < tokenB_ ? tokenA_ : tokenB_)) Ownable(msg.sender) {
        if (
            address(positionManager_) == address(0) || address(swapRouter_) == address(0)
                || address(pool_) == address(0)
        ) {
            revert ZeroAddress();
        }

        address t0 = tokenA_ < tokenB_ ? tokenA_ : tokenB_;
        address t1 = tokenA_ < tokenB_ ? tokenB_ : tokenA_;

        if (pool_.token0() != t0 || pool_.token1() != t1 || pool_.tickSpacing() != tickSpacing_) {
            revert InvalidTokenOrder();
        }

        positionManager = positionManager_;
        swapRouter = swapRouter_;
        pool = pool_;
        token0 = IERC20(t0);
        token1 = IERC20(t1);
        tickSpacing = tickSpacing_;
        rangeWidth = rangeWidth_;
        rebalanceThresholdBps = DEFAULT_REBALANCE_THRESHOLD_BPS;
        keeper = msg.sender;

        // Approvals deferred to deposit/rebalance — Mezo native BTC (0x7670…) lacks ERC20 approve.
    }

    /// @dev Set max allowance when the token supports ERC20 approve (native BTC may not).
    function _ensureMaxAllowance(IERC20 token, address spender) internal {
        if (token.allowance(address(this), spender) == type(uint256).max) return;
        try token.approve(spender, type(uint256).max) returns (bool success) {
            if (!success) {
                try token.approve(spender, 0) returns (bool) {} catch {}
                try token.approve(spender, type(uint256).max) {} catch {}
            }
        } catch {}
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ERC-4626 (token0-denominated accounting; use depositDual / redeemDual)
    // ─────────────────────────────────────────────────────────────────────────

    /// @inheritdoc ERC4626
    /// @dev Returns total vault value denominated in token0 (idle balances + active position).
    function totalAssets() public view override returns (uint256) {
        (uint256 total0, uint256 total1) = totalBalances();
        (uint160 sqrtPriceX96, ) = _currentSqrtPrice();
        return total0 + _token1ToToken0(total1, sqrtPriceX96);
    }

    /// @inheritdoc ERC4626
    function deposit(uint256, address) public pure override returns (uint256) {
        revert UseDepositDual();
    }

    /// @inheritdoc ERC4626
    function mint(uint256, address) public pure override returns (uint256) {
        revert UseDepositDual();
    }

    /// @inheritdoc ERC4626
    function maxDeposit(address receiver) public view override returns (uint256) {
        if (paused()) return 0;
        return super.maxDeposit(receiver);
    }

    /// @inheritdoc ERC4626
    function maxMint(address receiver) public view override returns (uint256) {
        if (paused()) return 0;
        return super.maxMint(receiver);
    }

    /// @inheritdoc ERC4626
    function maxWithdraw(address owner) public view override returns (uint256) {
        if (paused()) return 0;
        return super.maxWithdraw(owner);
    }

    /// @inheritdoc ERC4626
    function maxRedeem(address owner) public view override returns (uint256) {
        if (paused()) return 0;
        return super.maxRedeem(owner);
    }

    /// @notice Deposit equal-value amounts of token0 and token1; mint vault shares to `receiver`.
    /// @param amount0 Amount of token0 to deposit.
    /// @param amount1 Amount of token1 to deposit.
    /// @param receiver Address that receives vault shares.
    /// @return shares Number of shares minted.
    function depositDual(uint256 amount0, uint256 amount1, address receiver)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 shares)
    {
        if (amount0 == 0 && amount1 == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();

        (uint160 sqrtPriceX96, ) = _currentSqrtPrice();
        _requireEqualDepositValue(amount0, amount1, sqrtPriceX96);

        uint256 assetsBefore = totalAssets();
        uint256 valueAdded = amount0 + _token1ToToken0(amount1, sqrtPriceX96);

        token0.safeTransferFrom(msg.sender, address(this), amount0);
        token1.safeTransferFrom(msg.sender, address(this), amount1);

        uint256 supply = totalSupply();
        shares = supply == 0 ? valueAdded : valueAdded.mulDiv(supply, assetsBefore, Math.Rounding.Floor);

        _mint(receiver, shares);
        _deployLiquidity();

        emit Deposited(msg.sender, amount0, amount1, shares);
        emit Deposit(msg.sender, receiver, valueAdded, shares);
    }

    /// @notice Redeem vault shares for proportional token0 and token1.
    /// @param shares Shares to burn.
    /// @param receiver Recipient of underlying tokens.
    /// @param owner Owner of the shares.
    /// @return amount0 token0 sent to `receiver`.
    /// @return amount1 token1 sent to `receiver`.
    function redeemDual(uint256 shares, address receiver, address owner)
        external
        nonReentrant
        whenNotPaused
        returns (uint256 amount0, uint256 amount1)
    {
        if (shares == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();

        uint256 maxShares = maxRedeem(owner);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxRedeem(owner, shares, maxShares);
        }

        (amount0, amount1) = _redeemShares(shares, receiver, owner, msg.sender);
        (uint160 sqrtPriceX96, ) = _currentSqrtPrice();
        uint256 assets = amount0 + _token1ToToken0(amount1, sqrtPriceX96);

        emit Withdrawn(owner, amount0, amount1, shares);
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /// @inheritdoc ERC4626
    function redeem(uint256 shares, address receiver, address owner)
        public
        override
        nonReentrant
        whenNotPaused
        returns (uint256 assets)
    {
        if (shares == 0) revert ZeroAmount();
        if (receiver == address(0)) revert ZeroAddress();

        uint256 maxShares = maxRedeem(owner);
        if (shares > maxShares) {
            revert ERC4626ExceededMaxRedeem(owner, shares, maxShares);
        }

        (uint256 amount0, uint256 amount1) = _redeemShares(shares, receiver, owner, msg.sender);
        (uint160 sqrtPriceX96, ) = _currentSqrtPrice();
        assets = amount0 + _token1ToToken0(amount1, sqrtPriceX96);

        emit Withdrawn(owner, amount0, amount1, shares);
        emit Withdraw(msg.sender, receiver, owner, assets, shares);
    }

    /// @inheritdoc ERC4626
    function withdraw(uint256, address, address) public pure override returns (uint256) {
        revert UseDepositDual();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Keeper / rebalance
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Returns true when the pool price is out of range or within the warning margin of an edge.
    /// @dev Off-chain keepers should call this before {rebalance}. Gas/profitability checks are deferred to the keeper.
    function needsRebalance() public view returns (bool) {
        return _shouldRebalance();
    }

    /// @notice Collect fees, exit the current range if needed, and mint a new centered position.
    /// @dev Callable only by {keeper} when unpaused and {needsRebalance} is true.
    function rebalance() external nonReentrant whenNotPaused {
        if (msg.sender != keeper) revert UnauthorizedKeeper();
        if (!_shouldRebalance()) revert RebalanceNotNeeded();

        uint256 oldTokenId = positionTokenId;

        (uint256 fees0, uint256 fees1) = _collectAllFees();
        if (fees0 > 0 || fees1 > 0) {
            emit FeesCompounded(fees0, fees1);
        }

        if (oldTokenId != 0) {
            _removeAllLiquidity(oldTokenId);
            _collectAllFees();
            _burnPositionNft(oldTokenId);
            positionTokenId = 0;
        }

        _balanceTokensForSymmetricMint();
        (int24 newLower, int24 newUpper) = _computeTickRange(_currentTick());
        (uint256 newTokenId, , , ) = _mintPosition(newLower, newUpper);

        positionTokenId = newTokenId;
        tickLower = newLower;
        tickUpper = newUpper;

        emit Rebalanced(oldTokenId, newTokenId, newLower, newUpper);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Admin
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Set the keeper authorized to call {rebalance}.
    function setKeeper(address keeper_) external onlyOwner {
        if (keeper_ == address(0)) revert ZeroAddress();
        keeper = keeper_;
    }

    /// @notice Update the warning margin that triggers {needsRebalance} (bps of range width).
    function setRebalanceThresholdBps(uint256 bps) external onlyOwner {
        require(bps <= BPS, "threshold");
        rebalanceThresholdBps = bps;
    }

    /// @notice Update the range preset used for new positions and rebalances.
    function setRangeWidth(RangeWidth width) external onlyOwner {
        rangeWidth = width;
    }

    /// @notice Set max slippage for token swaps during {rebalance} (basis points of spot quote).
    /// @dev When non-zero, {rebalance} passes `amountOutMinimum` to the swap router.
    function setRebalanceSwapSlippageBps(uint256 bps) external onlyOwner {
        require(bps <= BPS, "slippage");
        rebalanceSwapSlippageBps = bps;
    }

    /// @notice Pause deposits, withdrawals, and rebalances.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause vault operations.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @inheritdoc IERC721Receiver
    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Views
    // ─────────────────────────────────────────────────────────────────────────

    /// @notice Raw token0 and token1 balances including principal in the active position.
    function totalBalances() public view returns (uint256 total0, uint256 total1) {
        total0 = token0.balanceOf(address(this));
        total1 = token1.balanceOf(address(this));

        if (positionTokenId == 0) {
            return (total0, total1);
        }

        (uint160 sqrtPriceX96, ) = _currentSqrtPrice();
        (uint256 pos0, uint256 pos1) = _positionAmounts(positionTokenId, sqrtPriceX96);
        total0 += pos0;
        total1 += pos1;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal – rebalance signal
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev True when price is outside the active range or within `rebalanceThresholdBps` of an edge.
    function _shouldRebalance() internal view returns (bool) {
        if (positionTokenId == 0) {
            return false;
        }

        int24 currentTick = _currentTick();

        if (currentTick < tickLower || currentTick > tickUpper) {
            return true;
        }

        uint256 rangeWidthTicks = uint256(int256(tickUpper - tickLower));
        if (rangeWidthTicks == 0) {
            return true;
        }

        uint256 marginTicks = rangeWidthTicks.mulDiv(rebalanceThresholdBps, BPS, Math.Rounding.Ceil);
        if (marginTicks == 0) {
            marginTicks = 1;
        }

        int24 margin = int24(int256(marginTicks));
        return currentTick - tickLower <= margin || tickUpper - currentTick <= margin;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal – liquidity lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Deploy idle balances into the existing position or mint a new one.
    function _deployLiquidity() internal {
        uint256 amount0 = token0.balanceOf(address(this));
        uint256 amount1 = token1.balanceOf(address(this));
        if (amount0 == 0 && amount1 == 0) {
            return;
        }

        if (positionTokenId == 0) {
            (int24 lower, int24 upper) = _computeTickRange(_currentTick());
            (uint256 tokenId, , , ) = _mintPosition(lower, upper);
            positionTokenId = tokenId;
            tickLower = lower;
            tickUpper = upper;
            return;
        }

        positionManager.increaseLiquidity(
            INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: positionTokenId,
                amount0Desired: amount0,
                amount1Desired: amount1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
    }

    /// @dev Mint a new Uniswap V3 position NFT held by this vault.
    function _mintPosition(int24 lower, int24 upper)
        internal
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)
    {
        uint256 amount0Desired = token0.balanceOf(address(this));
        uint256 amount1Desired = token1.balanceOf(address(this));

        _ensureMaxAllowance(token0, address(positionManager));
        _ensureMaxAllowance(token1, address(positionManager));

        (tokenId, liquidity, amount0, amount1) = positionManager.mint(
            INonfungiblePositionManager.MintParams({
                token0: address(token0),
                token1: address(token1),
                tickSpacing: tickSpacing,
                tickLower: lower,
                tickUpper: upper,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            })
        );
    }

    /// @dev Collect all owed fees from the active position into the vault.
    function _collectAllFees() internal returns (uint256 amount0, uint256 amount1) {
        if (positionTokenId == 0) {
            return (0, 0);
        }

        (amount0, amount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: positionTokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
    }

    /// @dev Remove all liquidity from a position NFT.
    function _removeAllLiquidity(uint256 tokenId) internal {
        (, , , , , , , uint128 liquidity, , , , ) = positionManager.positions(tokenId);
        if (liquidity == 0) {
            return;
        }

        positionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
    }

    /// @dev Burn an empty position NFT after liquidity and fees are withdrawn.
    function _burnPositionNft(uint256 tokenId) internal {
        positionManager.burn(tokenId);
    }

    /// @dev Swap tokens toward a 50/50 value split at the current pool price before minting.
    function _balanceTokensForSymmetricMint() internal {
        (uint160 sqrtPriceX96, ) = _currentSqrtPrice();
        uint256 bal0 = token0.balanceOf(address(this));
        uint256 bal1 = token1.balanceOf(address(this));
        if (bal0 == 0 && bal1 == 0) {
            return;
        }

        uint256 totalValue0 = bal0 + _token1ToToken0(bal1, sqrtPriceX96);
        uint256 target0 = totalValue0 / 2;

        if (bal0 > target0) {
            uint256 amountIn = bal0 - target0;
            amountIn = _capSwapInput(address(token0), amountIn);
            _swapExactInput(address(token0), address(token1), amountIn);
        } else if (bal0 < target0) {
            uint256 deficit0 = target0 - bal0;
            uint256 amount1In = _token0ToToken1(deficit0, sqrtPriceX96);
            if (amount1In > bal1) {
                amount1In = bal1;
            }
            amount1In = _capSwapInput(address(token1), amount1In);
            if (amount1In > 0) {
                _swapExactInput(address(token1), address(token0), amount1In);
            }
        }
    }

    /// @dev Cap swap size to avoid exhausting thin pool liquidity during rebalance.
    function _capSwapInput(address tokenIn, uint256 amountIn) internal view returns (uint256) {
        uint256 poolBalance = IERC20(tokenIn).balanceOf(address(pool));
        if (poolBalance == 0) {
            return amountIn;
        }
        uint256 cap = poolBalance / 5;
        return amountIn > cap ? cap : amountIn;
    }

    /// @dev Execute a single-hop exact-input swap via the configured router.
    function _swapExactInput(address tokenIn, address tokenOut, uint256 amountIn) internal {
        if (amountIn == 0) {
            return;
        }

        _ensureMaxAllowance(IERC20(tokenIn), address(swapRouter));

        uint256 amountOutMinimum = 0;
        if (rebalanceSwapSlippageBps > 0) {
            (uint160 sqrtPriceX96, ) = _currentSqrtPrice();
            uint256 quotedOut = tokenIn == address(token0)
                ? _token0ToToken1(amountIn, sqrtPriceX96)
                : _token1ToToken0(amountIn, sqrtPriceX96);
            amountOutMinimum =
                quotedOut.mulDiv(BPS - rebalanceSwapSlippageBps, BPS, Math.Rounding.Floor);
        }

        swapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                tickSpacing: tickSpacing,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: 0
            })
        );
    }

    /// @dev Redeem `shares` for proportional token0/token1, adjusting Uniswap liquidity first.
    function _redeemShares(uint256 shares, address receiver, address owner, address caller)
        internal
        returns (uint256 amount0Out, uint256 amount1Out)
    {
        uint256 supply = totalSupply();
        if (caller != owner) {
            _spendAllowance(owner, caller, shares);
        }

        (uint256 fees0, uint256 fees1) = _collectAllFees();
        if (fees0 > 0 || fees1 > 0) {
            emit FeesCompounded(fees0, fees1);
        }

        if (positionTokenId != 0) {
            (, , , , , , , uint128 liquidity, , , , ) = positionManager.positions(positionTokenId);
            if (liquidity > 0) {
                uint128 liquidityToRemove = uint128(uint256(liquidity).mulDiv(shares, supply, Math.Rounding.Floor));
                if (liquidityToRemove > 0) {
                    positionManager.decreaseLiquidity(
                        INonfungiblePositionManager.DecreaseLiquidityParams({
                            tokenId: positionTokenId,
                            liquidity: liquidityToRemove,
                            amount0Min: 0,
                            amount1Min: 0,
                            deadline: block.timestamp
                        })
                    );
                    _collectAllFees();
                }
            }
        }

        uint256 bal0 = token0.balanceOf(address(this));
        uint256 bal1 = token1.balanceOf(address(this));

        amount0Out = bal0.mulDiv(shares, supply, Math.Rounding.Floor);
        amount1Out = bal1.mulDiv(shares, supply, Math.Rounding.Floor);

        _burn(owner, shares);

        if (amount0Out > 0) token0.safeTransfer(receiver, amount0Out);
        if (amount1Out > 0) token1.safeTransfer(receiver, amount1Out);

        if (shares == supply && positionTokenId != 0) {
            _burnPositionNft(positionTokenId);
            positionTokenId = 0;
            tickLower = 0;
            tickUpper = 0;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal – pricing / ticks
    // ─────────────────────────────────────────────────────────────────────────

    function _currentSqrtPrice() internal view returns (uint160 sqrtPriceX96, int24 tick) {
        (sqrtPriceX96, tick, , , , , ) = pool.slot0();
    }

    function _currentTick() internal view returns (int24 tick) {
        (, tick, , , , , ) = pool.slot0();
    }

    /// @dev Principal + tokens owed for a position at `sqrtPriceX96`.
    function _positionAmounts(uint256 tokenId, uint160 sqrtPriceX96)
        internal
        view
        returns (uint256 amount0, uint256 amount1)
    {
        (
            ,
            ,
            ,
            ,
            ,
            int24 lower,
            int24 upper,
            uint128 liquidity,
            ,
            ,
            uint128 tokensOwed0,
            uint128 tokensOwed1
        ) = positionManager.positions(tokenId);

        if (liquidity > 0) {
            (amount0, amount1) = LiquidityAmounts.getAmountsForLiquidity(
                sqrtPriceX96,
                TickMath.getSqrtRatioAtTick(lower),
                TickMath.getSqrtRatioAtTick(upper),
                liquidity
            );
        }

        amount0 += tokensOwed0;
        amount1 += tokensOwed1;
    }

    /// @dev Compute aligned tick bounds centered on `centerTick` using the configured {rangeWidth}.
    function _computeTickRange(int24 centerTick) internal view returns (int24 lower, int24 upper) {
        uint256 halfRange = _halfRangeTicks(rangeWidth);
        int24 half = int24(int256(halfRange));

        lower = _alignTickDown(centerTick - half, tickSpacing);
        upper = _alignTickUp(centerTick + half, tickSpacing);

        if (lower >= upper) {
            upper = lower + tickSpacing;
        }
    }

    function _halfRangeTicks(RangeWidth width) internal pure returns (uint256) {
        if (width == RangeWidth.TIGHT) return TIGHT_HALF_RANGE;
        if (width == RangeWidth.MEDIUM) return MEDIUM_HALF_RANGE;
        if (width == RangeWidth.WIDE) return WIDE_HALF_RANGE;
        revert InvalidRangeWidth();
    }

    function _alignTickDown(int24 tick, int24 spacing) internal pure returns (int24) {
        int24 compressed = tick / spacing;
        if (tick < 0 && tick % spacing != 0) {
            compressed--;
        }
        return compressed * spacing;
    }

    function _alignTickUp(int24 tick, int24 spacing) internal pure returns (int24) {
        int24 compressed = tick / spacing;
        if (tick > 0 && tick % spacing != 0) {
            compressed++;
        }
        return compressed * spacing;
    }

    /// @dev Convert token1 amount to token0 at `sqrtPriceX96`.
    function _token1ToToken0(uint256 amount1, uint160 sqrtPriceX96) internal pure returns (uint256) {
        if (amount1 == 0) return 0;
        return FullMath.mulDiv(amount1, FixedPoint96.Q96, sqrtPriceX96).mulDiv(
            FixedPoint96.Q96, uint256(sqrtPriceX96), Math.Rounding.Floor
        );
    }

    /// @dev Convert token0 amount to token1 at `sqrtPriceX96`.
    function _token0ToToken1(uint256 amount0, uint160 sqrtPriceX96) internal pure returns (uint256) {
        if (amount0 == 0) return 0;
        return FullMath.mulDiv(amount0, uint256(sqrtPriceX96), FixedPoint96.Q96).mulDiv(
            uint256(sqrtPriceX96), FixedPoint96.Q96, Math.Rounding.Ceil
        );
    }

    /// @dev Require both legs to represent equal value within {DEPOSIT_TOLERANCE_BPS}.
    function _requireEqualDepositValue(uint256 amount0, uint256 amount1, uint160 sqrtPriceX96) internal pure {
        uint256 value0Leg = amount0;
        uint256 value1Leg = _token1ToToken0(amount1, sqrtPriceX96);
        uint256 maxLeg = value0Leg > value1Leg ? value0Leg : value1Leg;
        if (maxLeg == 0) {
            revert ZeroAmount();
        }
        uint256 diff = value0Leg > value1Leg ? value0Leg - value1Leg : value1Leg - value0Leg;
        if (diff.mulDiv(BPS, maxLeg, Math.Rounding.Ceil) > DEPOSIT_TOLERANCE_BPS) {
            revert UnequalDepositValue();
        }
    }

}
