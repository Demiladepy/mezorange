// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISwapRouter} from "../interfaces/ISwapRouter.sol";

/// @dev Wraps a real SwapRouter, forwarding caller tokens, and can simulate slippage failures.
contract MockSwapRouter is ISwapRouter {
    using SafeERC20 for IERC20;

    ISwapRouter public immutable realRouter;
    bool public simulateSlippageFailure;

    constructor(ISwapRouter realRouter_) {
        realRouter = realRouter_;
    }

    function setSimulateSlippageFailure(bool enabled) external {
        simulateSlippageFailure = enabled;
    }

    function exactInputSingle(ISwapRouter.ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut)
    {
        if (simulateSlippageFailure && params.amountOutMinimum > 0) {
            revert("STF");
        }

        IERC20(params.tokenIn).safeTransferFrom(msg.sender, address(this), params.amountIn);
        IERC20(params.tokenIn).forceApprove(address(realRouter), params.amountIn);

        ISwapRouter.ExactInputSingleParams memory forwarded = params;
        forwarded.recipient = msg.sender;

        amountOut = realRouter.exactInputSingle(forwarded);
    }
}
