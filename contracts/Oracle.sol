// Oracle.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

// --- 介面與函式庫 ---
// 為了保持合約獨立，我們將需要的介面和函式庫直接定義或引入
interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function observe(uint32[] calldata secondsAgos) external view returns (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s);
}

library TickMath {
    function getSqrtRatioAtTick(int24 tick) internal pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= 887272, "T");
        uint256 ratio = absTick & 0x1 != 0 ? 0xfffcb933bd6fad37aa2d162d1a594001 : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4 != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8 != 0) ratio = (ratio * 0xffe5caca7e10e4e61c36248dc02da379) >> 128;
        if (absTick & 0x10 != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0) ratio = (ratio * 0xfcbe86c75d6ced848f39ebf43a425644) >> 128;
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
        sqrtPriceX96 = uint160(ratio);
    }
}

/**
 * @title Oracle
 * @notice 獨立的價格預言機，基於 Uniswap V3 的時間加權平均價格 (TWAP)。
 * @dev 負責提供兩種代幣之間的匯率，與核心遊戲邏輯解耦。
 */
contract Oracle is Ownable {
    // --- 狀態變數 ---
    IUniswapV3Pool public pool;
    address public token0;
    address public token1;
    uint32 public twapPeriod = 1800; // 30 分鐘

    // --- 事件 ---
    event PoolSet(address indexed newPoolAddress);
    event TwapPeriodSet(uint32 newTwapPeriod);

    // --- 構造函數 ---
    constructor(address initialOwner) Ownable(initialOwner) {}

    // --- 核心邏輯 ---
    function getAmountOut(address inputToken, address quoteToken, uint256 amountIn) external view returns (uint256 amountOut) {
        require(pool != IUniswapV3Pool(address(0)), "Oracle: Pool not set");
        require((inputToken == token0 && quoteToken == token1) || (inputToken == token1 && quoteToken == token0), "Oracle: Invalid token pair");

        int24 tick = _consult(twapPeriod);
        uint160 sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
        uint256 ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);

        bool isToken0Input = inputToken == token0;
        if (isToken0Input) {
            amountOut = (amountIn * ratioX192) >> 192;
        } else {
            amountOut = (amountIn * (1 << 192)) / ratioX192;
        }
    }

    function _consult(uint32 _period) internal view returns (int24 tick) {
        uint32[] memory periods = new uint32[](2);
        periods[0] = _period;
        periods[1] = 0;

        (int56[] memory tickCumulatives, ) = pool.observe(periods);
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];

        tick = int24(tickCumulativesDelta / int56(uint56(_period)));
    }

    // --- Owner 管理函式 ---
    function setPool(address _newPoolAddress) external onlyOwner {
        require(_newPoolAddress != address(0), "Oracle: Invalid pool address");
        pool = IUniswapV3Pool(_newPoolAddress);
        token0 = pool.token0();
        token1 = pool.token1();
        emit PoolSet(_newPoolAddress);
    }

    function setTwapPeriod(uint32 _newTwapPeriod) external onlyOwner {
        require(_newTwapPeriod > 0, "Oracle: TWAP period must be > 0");
        twapPeriod = _newTwapPeriod;
        emit TwapPeriodSet(_newTwapPeriod);
    }
}
