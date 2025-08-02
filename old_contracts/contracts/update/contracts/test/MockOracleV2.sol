// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockOracleV2 {
    address public immutable token0; // USD
    address public immutable token1; // SOUL
    uint256 public constant BASE_RATIO = 16971; // 基礎比例
    uint256 private nonce; // 用於生成偽隨機數
    
    constructor(address _usdToken, address _soulToken) {
        token0 = _usdToken;
        token1 = _soulToken;
        nonce = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
    }
    
    function getAmountOut(address tokenIn, uint256 amountIn) external returns (uint256) {
        // 更新 nonce 以產生變化
        nonce = uint256(keccak256(abi.encodePacked(nonce, block.timestamp, msg.sender)));
        
        // 生成 -100 到 +100 的偽隨機波動（約 ±0.6%）
        int256 variation = int256(nonce % 201) - 100;
        
        if (tokenIn == token0) {
            // USD to SOUL: 基礎比例 + 小幅波動
            uint256 adjustedRatio = uint256(int256(BASE_RATIO) + variation);
            return amountIn * adjustedRatio / 1e18 * 1e18;
        } else if (tokenIn == token1) {
            // SOUL to USD
            uint256 adjustedRatio = uint256(int256(BASE_RATIO) + variation);
            return amountIn * 1e18 / adjustedRatio;
        } else {
            revert("Invalid token");
        }
    }
    
    // 兼容舊版本的函數
    function getSoulShardPriceInUSD() external view returns (uint256) {
        // 返回 1 SOUL 的 USD 價格 (18 decimals)
        return 1e18 / BASE_RATIO;
    }
}