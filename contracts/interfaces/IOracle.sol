// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IOracle Interface
 * @notice 價格預言機的外部接口。
 */
interface IOracle {
    /**
     * @notice 根據輸入的代幣數量，計算可兌換的輸出代幣數量。
     * @param _tokenIn 輸入代幣的地址。
     * @param _tokenOut 輸出代幣的地址。
     * @param _amountIn 輸入代幣的數量。
     * @return amountOut 可兌換的輸出代幣數量。
     */
    function getAmountOut(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountIn
    ) external view returns (uint256 amountOut);

    /**
     * @notice 根據期望的輸出代幣數量，計算需要輸入的代幣數量。
     * @param _tokenIn 輸入代幣的地址。
     * @param _tokenOut 輸出代幣的地址。
     * @param _amountOut 期望輸出的代幣數量。
     * @return amountIn 需要輸入的代幣數量。
     */
    function getAmountIn(
        address _tokenIn,
        address _tokenOut,
        uint256 _amountOut
    ) external view returns (uint256 amountIn);
}
