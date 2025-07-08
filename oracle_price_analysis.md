# Oracle 價格差距分析報告

## 問題描述
用戶報告Oracle預言機與實際價格有約**四倍差距**，需要分析原因並提供解決方案。

## 關鍵問題分析

### 1. 價格計算公式錯誤 ⭐ **主要問題**

**問題所在：**
```solidity
// 用戶代碼中的錯誤邏輯
if (isSoulShardToken0) {
    // Price of token0 in token1 = ratioX192 / 2**192
    price = ratioX192.mulDiv(1e18, Q192);
} else {
    // Price of token1 in token0 = 2**192 / ratioX192  
    price = Q192.mulDiv(1e18, ratioX192);
}
```

**錯誤原因：**
- Uniswap V3 的 `sqrtRatioX96` 代表 `sqrt(token1/token0) * 2^96`
- `ratioX192 = sqrtRatioX96^2 = (token1/token0) * 2^192`
- 用戶代碼中直接用 `ratioX192.mulDiv(1e18, Q192)` 會得到 `token1/token0` 的比例
- 但這不一定是 SoulShard 相對於 USD 的價格

### 2. 代幣順序混淆

**問題：**
- 如果 `isSoulShardToken0 = true`，意味著 SoulShard 是 token0，USD 是 token1
- `ratioX192 / 2^192 = token1/token0 = USD/SoulShard`
- 但用戶想要的是 `SoulShard/USD` 的價格，所以應該取倒數

### 3. TWAP 計算的舍入誤差

**問題：**
```solidity
int24 tick = int24(tickCumulativesDelta / int56(uint56(twapPeriod)));
```
這個整數除法會造成舍入誤差，對於小的價格變動可能影響顯著。

### 4. 缺少小數位數調整

**問題：**
如果 SoulShard 和 USD 的小數位數不同，需要額外的精度調整。

## 修正後的 Oracle 合約

```solidity
// contracts/Oracle.sol (修正版)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

library MulDiv {
    function mulDiv(
        uint256 a,
        uint256 b,
        uint256 denominator
    ) internal pure returns (uint256 result) {
        // ... (保持原有實現)
    }
}

library TickMath {
    // ... (保持原有實現)
}

contract Oracle is Ownable {
    using MulDiv for uint256;

    IUniswapV3Pool public immutable pool;
    address public immutable soulShardToken;
    address public immutable usdToken;
    bool private immutable isSoulShardToken0;
    uint8 private immutable soulShardDecimals;
    uint8 private immutable usdDecimals;
    
    uint32 public twapPeriod;
    event TwapPeriodUpdated(uint32 newTwapPeriod);

    constructor(
        address _poolAddress,
        address _soulShardTokenAddress,
        address _usdTokenAddress
    ) Ownable(msg.sender) {
        require(_poolAddress != address(0), "Oracle: Zero pool address");
        require(_soulShardTokenAddress != address(0), "Oracle: Zero SoulShard address");
        require(_usdTokenAddress != address(0), "Oracle: Zero USD address");
        
        pool = IUniswapV3Pool(_poolAddress);
        soulShardToken = _soulShardTokenAddress;
        usdToken = _usdTokenAddress;

        address token0 = pool.token0();
        address token1 = pool.token1();
        require(
            (token0 == soulShardToken && token1 == usdToken) || 
            (token0 == usdToken && token1 == soulShardToken), 
            "Oracle: Pool tokens mismatch"
        );
        
        isSoulShardToken0 = (soulShardToken == token0);
        
        // 獲取代幣小數位數
        soulShardDecimals = IERC20Metadata(soulShardToken).decimals();
        usdDecimals = IERC20Metadata(usdToken).decimals();

        twapPeriod = 1800; // 預設 30 分鐘
    }

    /**
     * @notice 獲取 SoulShard 相對於 USD 的價格
     * @return price SoulShard 的 USD 價格，以 USD 代幣的小數位數表示
     */
    function getSoulShardPriceInUSD() public view returns (uint256 price) {
        (uint160 sqrtRatioX96) = _getTWAPSqrtRatio();
        
        // sqrtRatioX96 = sqrt(token1/token0) * 2^96
        // ratioX192 = (token1/token0) * 2^192
        uint256 ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);
        uint256 Q192 = 1 << 192;

        if (isSoulShardToken0) {
            // token0 = SoulShard, token1 = USD
            // ratioX192 / 2^192 = USD/SoulShard
            // 我們要的是 SoulShard/USD，所以要取倒數
            require(ratioX192 != 0, "Oracle: ZERO_PRICE");
            price = Q192.mulDiv(10**usdDecimals, ratioX192);
            
            // 調整小數位數差異
            if (soulShardDecimals != usdDecimals) {
                if (soulShardDecimals > usdDecimals) {
                    price = price * (10**(soulShardDecimals - usdDecimals));
                } else {
                    price = price / (10**(usdDecimals - soulShardDecimals));
                }
            }
        } else {
            // token0 = USD, token1 = SoulShard  
            // ratioX192 / 2^192 = SoulShard/USD
            price = ratioX192.mulDiv(10**usdDecimals, Q192);
            
            // 調整小數位數差異
            if (soulShardDecimals != usdDecimals) {
                if (soulShardDecimals > usdDecimals) {
                    price = price / (10**(soulShardDecimals - usdDecimals));
                } else {
                    price = price * (10**(usdDecimals - soulShardDecimals));
                }
            }
        }
    }

    /**
     * @notice 獲取 TWAP 的 sqrtRatio
     */
    function _getTWAPSqrtRatio() private view returns (uint160 sqrtRatioX96) {
        uint32[] memory periods = new uint32[](2);
        periods[0] = twapPeriod;
        periods[1] = 0;
        
        (int56[] memory tickCumulatives, ) = pool.observe(periods);
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        
        // 使用更精確的 tick 計算，加上舍入
        int24 tick = int24(tickCumulativesDelta / int56(uint56(twapPeriod)));
        
        // 處理舍入：如果餘數大於等於 period/2，則向上舍入
        if (tickCumulativesDelta % int56(uint56(twapPeriod)) >= int56(uint56(twapPeriod)) / 2) {
            if (tickCumulativesDelta >= 0) {
                tick += 1;
            }
        } else if (tickCumulativesDelta % int56(uint56(twapPeriod)) <= -int56(uint56(twapPeriod)) / 2) {
            if (tickCumulativesDelta < 0) {
                tick -= 1;
            }
        }
        
        sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
    }

    /**
     * @notice 計算代幣交換數量
     */
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        require(tokenIn == soulShardToken || tokenIn == usdToken, "Oracle: Invalid input token");
        require(amountIn > 0, "Oracle: Invalid amount");

        uint256 soulShardPrice = getSoulShardPriceInUSD();
        require(soulShardPrice > 0, "Oracle: ZERO_PRICE");

        if (tokenIn == soulShardToken) {
            // 輸入 SoulShard，輸出 USD
            amountOut = amountIn.mulDiv(soulShardPrice, 10**soulShardDecimals);
        } else {
            // 輸入 USD，輸出 SoulShard  
            amountOut = amountIn.mulDiv(10**soulShardDecimals, soulShardPrice);
        }
    }

    function setTwapPeriod(uint32 _newTwapPeriod) external onlyOwner {
        require(_newTwapPeriod > 0, "Oracle: TWAP period must be > 0");
        twapPeriod = _newTwapPeriod;
        emit TwapPeriodUpdated(_newTwapPeriod);
    }
}
```

## 主要修正點

### 1. 正確的價格計算邏輯
- 明確區分 `token1/token0` 和 `SoulShard/USD` 的關係
- 根據代幣順序正確應用或取倒數

### 2. 小數位數處理
- 動態獲取兩個代幣的小數位數
- 在價格計算中正確調整精度

### 3. 改進的 TWAP 計算
- 加入舍入邏輯減少誤差
- 更精確的 tick 計算

### 4. 防錯檢查
- 加入零值檢查
- 驗證代幣對配置

## 測試建議

1. **單元測試**：測試不同價格水平下的準確性
2. **對比測試**：與 Uniswap 前端顯示的價格對比
3. **邊界測試**：測試極端價格情況
4. **精度測試**：測試小數位數不同的代幣對

## 總結

主要問題是**價格計算公式的邏輯錯誤**和**缺少小數位數調整**。修正後的合約應該能解決四倍差距的問題。建議在部署前進行充分測試以驗證準確性。