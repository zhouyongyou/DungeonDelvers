// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IPlayerVault Interface
 * @notice 玩家資金庫的外部接口。
 */
interface IPlayerVault {
    /**
     * @notice 獲取協議使用的 Soul Shard 代幣合約地址。
     */
    function soulShardToken() external view returns (IERC20);

    /**
     * @notice 玩家向資金庫存入 Soul Shard。
     */
    function deposit(uint256 amount) external;

    /**
     * @notice 玩家從資金庫提取 Soul Shard。
     */
    function withdraw(uint256 amount) external;

    /**
     * @notice 為遊戲內消費扣除玩家的資金。
     * @dev 應由其他核心合約（如 Hero, Relic）呼叫。
     */
    function spendForGame(address player, uint256 amount) external;

    /**
     * @notice 查詢指定玩家在資金庫中的餘額。
     */
    function balanceOf(address player) external view returns (uint256);
}
