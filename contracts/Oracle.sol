// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces.sol"; // 假設所有外部介面都在此檔案中

/// @title TickMath library for computing sqrt prices from ticks and vice versa
/// @notice Computes sqrt price for ticks of size 1.0001, i.e. sqrt(1.0001^tick) as fixed point Q64.96 numbers.
/// @dev This is the full, audited library from Uniswap V3.
library TickMath {
    int24 internal constant MIN_TICK = -887272;
    int24 internal constant MAX_TICK = 887272;

    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;

    function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(int256(tick) * -1) : uint256(int256(tick));
        require(absTick <= uint256(int256(MAX_TICK)), 'T');
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


/**
 * @title Oracle (最終防呆版)
 * @notice 負責從 PancakeSwap V3 的流動性池中，安全地讀取時間加權平均價格 (TWAP)。
 * @dev 此版本在部署時自動校準 Token0/1 順序，並將關鍵參數設為不可變，以提升安全性。
 */
contract Oracle is Ownable {

    // --- 狀態變數 ---
    IUniswapV3Pool public immutable pool;
    address public immutable soulShardToken;
    address public immutable usdToken;
    
    // 這個布林值在部署時被永久設定，用於記錄 SoulShard 是否為池中的 Token0
    bool private immutable isSoulShardToken0;
    
    uint32 public twapPeriod;

    // --- 事件 ---
    event TwapPeriodUpdated(uint32 newTwapPeriod);

    /**
     * @param _poolAddress PancakeSwap V3 流動性池的地址。
     * @param _soulShardTokenAddress 您的遊戲代幣地址。
     * @param _usdTokenAddress 您的穩定幣地址。
     */
    constructor(
        address _poolAddress,
        address _soulShardTokenAddress,
        address _usdTokenAddress
    ) Ownable(msg.sender) { // 將部署者設為擁有者
        require(_poolAddress != address(0) && _soulShardTokenAddress != address(0) && _usdTokenAddress != address(0), "Oracle: Zero address");
        
        pool = IUniswapV3Pool(_poolAddress);
        soulShardToken = _soulShardTokenAddress;
        usdToken = _usdTokenAddress;

        // 自動校準並記錄代幣順序
        address token0 = pool.token0();
        require(token0 == soulShardToken || token0 == usdToken, "Oracle: Pool tokens mismatch");
        isSoulShardToken0 = (soulShardToken == token0);

        // 設定初始的 TWAP 週期，例如 30 分鐘
        twapPeriod = 1800; 
    }

    /**
     * @notice 根據輸入的 tokenIn 數量，計算能兌換多少 tokenOut。
     * @param tokenIn 支付的代幣地址 (必須是 SoulShard 或 USD)。
     * @param amountIn 支付的代幣數量。
     * @return amountOut 得到的代幣數量。
     */
    function getAmountOut(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        require(tokenIn == soulShardToken || tokenIn == usdToken, "Oracle: Invalid input token");

        // 1. 從池子獲取時間加權平均 Tick
        uint32[] memory periods = new uint32[](2);
        periods[0] = twapPeriod;
        periods[1] = 0;
        (int56[] memory tickCumulatives, ) = pool.observe(periods);
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        int24 tick = int24(tickCumulativesDelta / int56(uint56(twapPeriod)));

        // 2. 將 Tick 轉換為價格的平方根
        uint160 sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
        
        // 3. 計算價格 (Q128.128 格式)
        uint256 ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);

        // 4. 根據代幣順序和輸入代幣，計算最終輸出
        if (tokenIn == soulShardToken) { // 如果支付 SoulShard, 想得到 USD
            if (isSoulShardToken0) { // SoulShard 是 Token0, USD 是 Token1
                // 原始價格 ratioX192 代表 Token1/Token0 (USD/SOUL)
                amountOut = (amountIn * ratioX192) >> 192;
            } else { // SoulShard 是 Token1, USD 是 Token0
                // 原始價格 ratioX192 代表 Token1/Token0 (SOUL/USD)
                // 我們需要取倒數
                amountOut = (amountIn * (1 << 192)) / ratioX192;
            }
        } else { // 如果支付 USD, 想得到 SoulShard
            if (isSoulShardToken0) { // SoulShard 是 Token0, USD 是 Token1
                // 原始價格 ratioX192 代表 Token1/Token0 (USD/SOUL)
                // 我們需要取倒數
                amountOut = (amountIn * (1 << 192)) / ratioX192;
            } else { // SoulShard 是 Token1, USD 是 Token0
                // 原始價格 ratioX192 代表 Token1/Token0 (SOUL/USD)
                amountOut = (amountIn * ratioX192) >> 192;
            }
        }
    }

    // --- Owner 管理函式 ---
    function setTwapPeriod(uint32 _newTwapPeriod) external onlyOwner {
        require(_newTwapPeriod > 0, "Oracle: TWAP period must be > 0");
        twapPeriod = _newTwapPeriod;
        emit TwapPeriodUpdated(_newTwapPeriod);
    }
}