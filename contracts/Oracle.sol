// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/external/IUniswapV3Pool.sol";
import "./libraries/TickMath.sol";
import "./libraries/FixedPoint96.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Oracle is Ownable {
    IUniswapV3Pool public pool;
    address public immutable token0;
    address public immutable token1;
    uint32 public constant TWAP_PERIOD = 1800; // 30 分鐘

    event PoolUpdated(address indexed newPool);

    constructor(address _poolAddress) {
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
            amountOut = (amountIn * FixedPoint96.Q96) / (ratioX192 / FixedPoint96.Q96);
        }
    }

    function _consult(uint32 period) internal view returns (int24 tick) {
        uint32[] memory periods = new uint32[](2);
        periods[0] = period;
        periods[1] = 0;

        (int56[] memory tickCumulatives, ) = pool.observe(periods);
        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];

        tick = int24(tickCumulativesDelta / int56(uint56(period)));
    }

    function setPool(address _newPoolAddress) external onlyOwner {
        require(_newPoolAddress != address(0), "Oracle: Invalid pool address");
        pool = IUniswapV3Pool(_newPoolAddress);
        emit PoolUpdated(_newPoolAddress);
    }
}