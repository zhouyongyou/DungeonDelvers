// contracts/Oracle_Fixed.sol (修正四倍差距問題)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

// 高精度數學函式庫
library MulDiv {
    function mulDiv(
        uint256 a,
        uint256 b,
        uint256 denominator
    ) internal pure returns (uint256 result) {
        uint256 prod0; 
        uint256 prod1; 
        assembly {
            let mm := mulmod(a, b, not(0))
            prod0 := mul(a, b)
            prod1 := sub(mm, prod0)
            if lt(mm, prod0) {
                prod1 := sub(prod1, 1)
            }
        }

        if (prod1 == 0) {
            require(denominator > 0, "ZERO_DENOMINATOR");
            result = prod0 / denominator;
            return result;
        }

        require(denominator > prod1, "OVERFLOW");

        uint256 remainder;
        assembly {
            remainder := mulmod(a, b, denominator)
            prod0 := sub(prod0, remainder)
            prod1 := sub(prod1, mul(0, remainder))
            if lt(prod0, remainder) {
                prod1 := sub(prod1, 1)
            }
        }

        uint256 twos = (~denominator + 1) & denominator;
        assembly {
            denominator := div(denominator, twos)
        }
        assembly {
            prod0 := div(prod0, twos)
        }
        
        assembly {
            let inv := mul(3, denominator)
            inv := xor(inv, 2)
            inv := mul(inv, sub(2, mul(denominator, inv)))
            inv := mul(inv, sub(2, mul(denominator, inv)))
            inv := mul(inv, sub(2, mul(denominator, inv)))
            inv := mul(inv, sub(2, mul(denominator, inv)))
            inv := mul(inv, sub(2, mul(denominator, inv)))
            inv := mul(inv, sub(2, mul(denominator, inv)))
            result := mul(prod0, inv)
        }
    }
}

// Uniswap V3 Tick 數學函式庫
library TickMath {
    function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(int256(tick) * -1) : uint256(int256(tick));
        require(absTick <= 887272, "T");
        uint256 ratio = absTick & 0x1 != 0 ? 0xfffcb933bd6fad37aa2d162d1a594001 : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4 != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8 != 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0) >> 128;
        if (absTick & 0x10 != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4) >> 128;
        if (absTick & 0x200 != 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54) >> 128;
        if (absTick & 0x400 != 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3) >> 128;
        if (absTick & 0x800 != 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9) >> 128;
        if (absTick & 0x1000 != 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825) >> 128;
        if (absTick & 0x2000 != 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5) >> 128;
        if (absTick & 0x4000 != 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7) >> 128;
        if (absTick & 0x8000 != 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6) >> 128;
        if (absTick & 0x10000 != 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9) >> 128;
        if (absTick & 0x20000 != 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604) >> 128;
        if (absTick & 0x40000 != 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98) >> 128;
        if (absTick & 0x80000 != 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2) >> 128;
        if (tick > 0) ratio = type(uint256).max / ratio;
        sqrtPriceX96 = uint160((ratio >> 32) + (ratio % (1 << 32) == 0 ? 0 : 1));
    }
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
     * @notice 獲取 SoulShard 相對於 USD 的價格 (修正版)
     * @return price SoulShard 的 USD 價格，統一以 18 位小數表示
     */
    function getSoulShardPriceInUSD() public view returns (uint256 price) {
        uint160 sqrtRatioX96 = _getTWAPSqrtRatio();
        
        // sqrtRatioX96 = sqrt(token1/token0) * 2^96
        // ratioX192 = (token1/token0) * 2^192
        uint256 ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);
        uint256 Q192 = 1 << 192;

        if (isSoulShardToken0) {
            // token0 = SoulShard, token1 = USD
            // ratioX192 / Q192 = USD/SoulShard (token1/token0)
            // 我們要的是 SoulShard的USD價格，即：每1個SoulShard值多少USD
            // 所以價格 = (USD/SoulShard) * (SoulShard單位調整) / (USD單位調整)
            require(ratioX192 != 0, "Oracle: ZERO_PRICE");
            
            // 基礎價格：USD/SoulShard
            price = ratioX192.mulDiv(1e18, Q192);
            
            // 調整小數位數：從SoulShard的小數位調整到USD的小數位，最終輸出18位小數
            if (soulShardDecimals > usdDecimals) {
                price = price / (10**(soulShardDecimals - usdDecimals));
            } else if (soulShardDecimals < usdDecimals) {
                price = price * (10**(usdDecimals - soulShardDecimals));
            }
            // 如果小數位數相同，price保持不變
            
        } else {
            // token0 = USD, token1 = SoulShard  
            // ratioX192 / Q192 = SoulShard/USD (token1/token0)
            // 這正好是我們要的：每1個USD可以買多少SoulShard
            // 但我們要的是每1個SoulShard值多少USD，所以要取倒數
            require(ratioX192 != 0, "Oracle: ZERO_PRICE");
            
            // 取倒數：USD/SoulShard
            price = Q192.mulDiv(1e18, ratioX192);
            
            // 調整小數位數
            if (soulShardDecimals > usdDecimals) {
                price = price * (10**(soulShardDecimals - usdDecimals));
            } else if (soulShardDecimals < usdDecimals) {
                price = price / (10**(usdDecimals - soulShardDecimals));
            }
        }
    }

    /**
     * @notice 獲取 TWAP 的 sqrtRatio (改進舍入處理)
     */
    function _getTWAPSqrtRatio() private view returns (uint160 sqrtRatioX96) {
        uint32[] memory periods = new uint32[](2);
        periods[0] = twapPeriod;
        periods[1] = 0;
        
        (int56[] memory tickCumulatives, ) = pool.observe(periods);
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        
        // 改進的 tick 計算，加入舍入邏輯
        int56 twapPeriodInt56 = int56(uint56(twapPeriod));
        int24 tick = int24(tickCumulativesDelta / twapPeriodInt56);
        
        // 處理舍入誤差
        int56 remainder = tickCumulativesDelta % twapPeriodInt56;
        int56 halfPeriod = twapPeriodInt56 / 2;
        
        if (remainder >= halfPeriod) {
            tick += 1;
        } else if (remainder <= -halfPeriod) {
            tick -= 1;
        }
        
        sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
    }

    /**
     * @notice 計算代幣交換數量 (修正版)
     */
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        require(tokenIn == soulShardToken || tokenIn == usdToken, "Oracle: Invalid input token");
        require(amountIn > 0, "Oracle: Invalid amount");

        uint256 soulShardPrice = getSoulShardPriceInUSD(); // 18位小數的價格
        require(soulShardPrice > 0, "Oracle: ZERO_PRICE");

        if (tokenIn == soulShardToken) {
            // 輸入 SoulShard，輸出 USD
            // amountOut = amountIn * price / 10^18 * 10^usdDecimals / 10^soulShardDecimals
            amountOut = amountIn.mulDiv(soulShardPrice, 1e18);
            
            // 調整輸出代幣的小數位數
            if (soulShardDecimals > usdDecimals) {
                amountOut = amountOut / (10**(soulShardDecimals - usdDecimals));
            } else if (soulShardDecimals < usdDecimals) {
                amountOut = amountOut * (10**(usdDecimals - soulShardDecimals));
            }
            
        } else {
            // 輸入 USD，輸出 SoulShard  
            // amountOut = amountIn / price * 10^18 * 10^soulShardDecimals / 10^usdDecimals
            amountOut = amountIn.mulDiv(1e18, soulShardPrice);
            
            // 調整輸出代幣的小數位數
            if (usdDecimals > soulShardDecimals) {
                amountOut = amountOut / (10**(usdDecimals - soulShardDecimals));
            } else if (usdDecimals < soulShardDecimals) {
                amountOut = amountOut * (10**(soulShardDecimals - usdDecimals));
            }
        }
    }

    /**
     * @notice 獲取當前瞬時價格 (用於調試對比)
     */
    function getCurrentPrice() external view returns (uint256 price) {
        (uint160 sqrtRatioX96, , , , , , ) = pool.slot0();
        
        uint256 ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);
        uint256 Q192 = 1 << 192;

        if (isSoulShardToken0) {
            require(ratioX192 != 0, "Oracle: ZERO_PRICE");
            price = ratioX192.mulDiv(1e18, Q192);
            
            if (soulShardDecimals > usdDecimals) {
                price = price / (10**(soulShardDecimals - usdDecimals));
            } else if (soulShardDecimals < usdDecimals) {
                price = price * (10**(usdDecimals - soulShardDecimals));
            }
        } else {
            require(ratioX192 != 0, "Oracle: ZERO_PRICE");
            price = Q192.mulDiv(1e18, ratioX192);
            
            if (soulShardDecimals > usdDecimals) {
                price = price * (10**(soulShardDecimals - usdDecimals));
            } else if (soulShardDecimals < usdDecimals) {
                price = price / (10**(usdDecimals - soulShardDecimals));
            }
        }
    }

    function setTwapPeriod(uint32 _newTwapPeriod) external onlyOwner {
        require(_newTwapPeriod > 0, "Oracle: TWAP period must be > 0");
        twapPeriod = _newTwapPeriod;
        emit TwapPeriodUpdated(_newTwapPeriod);
    }

    // 調試函數：獲取代幣信息
    function getTokenInfo() external view returns (
        address token0,
        address token1,
        uint8 token0Decimals,
        uint8 token1Decimals,
        bool soulShardIsToken0
    ) {
        token0 = pool.token0();
        token1 = pool.token1();
        token0Decimals = IERC20Metadata(token0).decimals();
        token1Decimals = IERC20Metadata(token1).decimals();
        soulShardIsToken0 = isSoulShardToken0;
    }
}