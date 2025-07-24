
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockOracleRealPrice {
    address public immutable token0; // USD
    address public immutable token1; // SOUL
    uint256 public constant PRICE_RATIO = 16972; // 基於真實 Pool 價格
    
    constructor(address _usdToken, address _soulToken) {
        token0 = _usdToken;
        token1 = _soulToken;
    }
    
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256) {
        if (tokenIn == token0) {
            // USD to SOUL
            return amountIn * PRICE_RATIO / 1e18 * 1e18;
        } else if (tokenIn == token1) {
            // SOUL to USD
            return amountIn * 1e18 / PRICE_RATIO;
        } else {
            revert("Invalid token");
        }
    }
}