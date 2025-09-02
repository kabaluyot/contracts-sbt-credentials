// Reference: https://github.com/vittominacori/eth-token-recover
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title RecoverERC20
/// @dev Allows to recover any ERC-20 token sent into the contract and sends them to a receiver.
/// @dev Only callable by contract owner. Internally calls RecoverERC20::_recoverERC20
abstract contract RecoverERC20 {
    /// @dev Recovers a `tokenAmount` of the ERC-20 `tokenAddress` locked into this contract
    /// and sends them to the `tokenReceiver` address.
    /// @param _tokenAddress The contract address of the token to recover.
    /// @param _tokenReceiver The address that will receive the recovered tokens.
    /// @param _tokenAmount Number of tokens to be recovered.
    function _recoverERC20(
        address _tokenAddress,
        address _tokenReceiver,
        uint256 _tokenAmount
    ) internal virtual {
        // slither-disable-next-line unchecked-transfer
        IERC20(_tokenAddress).transfer(_tokenReceiver, _tokenAmount);
    }
}
