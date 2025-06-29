// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/external/IUniswapV3Pool.sol";
import "./libraries/TickMath.sol";
import "./libraries/FixedPoint96.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Oracle is Ownable {
    IUniswapV3Pool public pool;
    address public token0; // <--- 移除 immutable
    address public token1; // <--- 移除 immutable
    uint32 public constant TWAP_PERIOD = 1800; // 30 分鐘

    event PoolUpdated(address indexed newPool);

    // BUG 1 修正：初始化 Ownable，並傳入 msg.sender
    constructor(address _poolAddress) Ownable(msg.sender) {
        require(_poolAddress != address(0), "Oracle: Invalid pool address");
        pool = IUniswapV3Pool(_poolAddress);
        token0 = pool.token0();
        token1 = pool.token1();
    }

    function getAmountOut(
        address inputToken,
        address quoteToken,
        uint256 amountIn
    ) public view returns (uint256 amountOut) {
        require(
            (inputToken == token0 && quoteToken == token1) || (inputToken == token1 && quoteToken == token0),
            "Oracle: Invalid token pair"
        );

        int24 tick = _consult(TWAP_PERIOD);
        uint160 sqrtRatioX96 = TickMath.getSqrtRatioAtTick(tick);
        uint256 ratioX192 = uint256(sqrtRatioX96) * uint256(sqrtRatioX96);

        bool isToken0Input = inputToken == token0;
        if (isToken0Input) {
            amountOut = (amountIn * ratioX192) >> 192;
        } else {
            // 為了避免下溢 (underflow)，在使用除法前先做乘法是好的實踐
            amountOut = (amountIn * FixedPoint96.Q96 * FixedPoint96.Q96) / ratioX192;
        }
    }

    function _consult(uint32 period) internal view returns (int24 tick) {
        // ... (此函式邏輯正確，無需修改)
        uint32[] memory periods = new uint32[](2);
        periods[0] = period;
        periods[1] = 0;

        (int56[] memory tickCumulatives, ) = pool.observe(periods);
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];

        tick = int24(tickCumulativesDelta / int56(uint56(period)));
    }

    // BUG 2 修正：同時更新 pool, token0, 和 token1
    function setPool(address _newPoolAddress) external onlyOwner {
        require(_newPoolAddress != address(0), "Oracle: Invalid pool address");
        pool = IUniswapV3Pool(_newPoolAddress);
        token0 = pool.token0(); // <--- 新增
        token1 = pool.token1(); // <--- 新增
        emit PoolUpdated(_newPoolAddress);
    }
}