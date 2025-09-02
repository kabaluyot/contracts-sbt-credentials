// Reference: https://github.com/vittominacori/eth-token-recover
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {RecoverERC20} from "./recover/RecoverERC20.sol";

/// @title ERC20Recover
/// @dev Allows the contract owner to recover any ERC-20 token sent into the contract and sends them to a receiver.
abstract contract ERC20Recover is Ownable, RecoverERC20 {
    /// @notice Initializes the contract setting the address provided by the deployer as the initial owner
    /// @param initialOwner The address that will be set as the initial owner
    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Recovers ERC-20 tokens locked in this contract and sends them to a receiver
    /// @dev Only callable by contract owner. Internally calls RecoverERC20::_recoverERC20
    /// @param _tokenAddress The contract address of the token to recover
    /// @param _tokenReceiver The address that will receive the recovered tokens
    /// @param _tokenAmount Number of tokens to be recovered
    function recoverERC20(
        address _tokenAddress,
        address _tokenReceiver,
        uint256 _tokenAmount
    ) public virtual onlyOwner {
        _recoverERC20(_tokenAddress, _tokenReceiver, _tokenAmount);
    }
}
