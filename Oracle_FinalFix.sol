// contracts/Oracle_FinalFix.sol (解決四倍差距問題)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces.sol";

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
    
    uint32 public twapPeriod;
    event TwapPeriodUpdated(uint32 newTwapPeriod);

    constructor(
        address _poolAddress,
        address _soulShardTokenAddress,
        address _usdTokenAddress
    ) Ownable(msg.sender) {
        require(_poolAddress != address(0) && _soulShardTokenAddress != address(0) && _usdTokenAddress != address(0), "Oracle: Zero address");
        
        pool = IUniswapV3Pool(_poolAddress);
        soulShardToken = _soulShardTokenAddress;
        usdToken = _usdTokenAddress;

        address token0 = pool.token0();
        require(token0 == soulShardToken || token0 == usdToken, "Oracle: Pool tokens mismatch");
        isSoulShardToken0 = (soulShardToken == token0);

        twapPeriod = 1800; // 預設 30 分鐘
    }

    /**
     * @notice 獲取 SoulShard 相對於 USD 的價格 (修正四倍差距問題)
     * @return price The price of 1 SoulShard in USD, with 18 decimals.
     */
    function getSoulShardPriceInUSD() public view returns (uint256 price) {
        uint32[] memory periods = new uint32[](2);
        periods[0] = twapPeriod;
        periods[1] = 0;
        (int56[] memory tickCumulatives, ) = pool.observe(periods);
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 tick = int24(tickCumulativesDelta / int56(uint56(twapPeriod)));
        
        uint160 sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
        uint256 ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);
        uint256 Q192 = 1 << 192;

        if (isSoulShardToken0) {
            // ⭐ 關鍵修正：
            // token0 = SoulShard, token1 = USD
            // ratioX192 / Q192 = USD/SoulShard
            // 我們要的是 SoulShard 價格（每個 SoulShard 值多少 USD），所以要取倒數
            require(ratioX192 != 0, "Oracle: ZERO_PRICE");
            price = Q192.mulDiv(1e18, ratioX192);  // 取倒數修正四倍差距！
        } else {
            // token0 = USD, token1 = SoulShard
            // ratioX192 / Q192 = SoulShard/USD
            // 我們要倒數才能得到 USD/SoulShard（SoulShard 的價格）
            price = ratioX192.mulDiv(1e18, Q192);
        }
    }

    /**
     * @notice 根據輸入的代幣和數量，計算出需要輸出的另一種代幣的數量
     * @param tokenIn 輸入的代幣地址 (SoulShard 或 USD)
     * @param amountIn 輸入的代幣數量
     * @return amountOut 輸出的代幣數量
     */
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        require(tokenIn == soulShardToken || tokenIn == usdToken, "Oracle: Invalid input token");

        uint256 soulShardPrice = getSoulShardPriceInUSD();
        require(soulShardPrice > 0, "Oracle: ZERO_PRICE");

        if (tokenIn == soulShardToken) { // Pay SOUL, get USD
            amountOut = amountIn.mulDiv(soulShardPrice, 1e18);
        } else { // Pay USD, get SOUL
            amountOut = amountIn.mulDiv(1e18, soulShardPrice);
        }
    }

    function setTwapPeriod(uint32 _newTwapPeriod) external onlyOwner {
        require(_newTwapPeriod > 0, "Oracle: TWAP period must be > 0");
        twapPeriod = _newTwapPeriod;
        emit TwapPeriodUpdated(_newTwapPeriod);
    }
}