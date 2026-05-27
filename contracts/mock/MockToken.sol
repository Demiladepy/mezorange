// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MockToken
/// @notice Simple 18-decimal ERC-20 for local and testnet vault testing.
contract MockToken is ERC20, Ownable {
    /// @param name_ Token name.
    /// @param symbol_ Token symbol.
    constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) Ownable(msg.sender) {}

    /// @inheritdoc ERC20
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /// @notice Mint tokens to an address (owner only).
    /// @param to Recipient of the minted tokens.
    /// @param amount Amount to mint (18 decimals).
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
