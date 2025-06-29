// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IOracle {
    function getAmountOut(address inputToken, address quoteToken, uint256 amountIn) external view returns (uint256 amountOut);
    function token0() external view returns (address);
    function token1() external view returns (address);
}