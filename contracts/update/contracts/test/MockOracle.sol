
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockOracle {
    address public immutable token0; // USD
    address public immutable token1; // SOUL
    uint256 public constant PRICE_RATIO = 16500; // 1 USD = 16500 SOUL
    
    constructor(address _usdToken, address _soulToken) {
        token0 = _usdToken;
        token1 = _soulToken;
    }
    
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256) {
        if (tokenIn == token0) {
            // USD to SOUL: multiply by PRICE_RATIO
            return amountIn * PRICE_RATIO / 1e18 * 1e18;
        } else if (tokenIn == token1) {
            // SOUL to USD: divide by PRICE_RATIO
            return amountIn * 1e18 / PRICE_RATIO;
        } else {
            revert("Invalid token");
        }
    }
    
    // 兼容舊版本的函數
    function getSoulShardPriceInUSD() external pure returns (uint256) {
        // 返回 1 SOUL 的 USD 價格 (18 decimals)
        // 1 SOUL = 1/16500 USD ≈ 0.0000606 USD
        return 1e18 / PRICE_RATIO;
    }
}
