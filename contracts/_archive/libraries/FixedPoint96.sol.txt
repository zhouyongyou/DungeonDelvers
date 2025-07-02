// File: contracts/libraries/FixedPoint96.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title FixedPoint96
/// @notice A library for handling Q64.96-bit fixed-point numbers, primarily for Uniswap V3 math.
library FixedPoint96 {
    uint256 internal constant Q96 = 0x1000000000000000000000000; // 2^96
}