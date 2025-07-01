// contracts/interfaces/IPlayerVault.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IPlayerVault Interface
 * @notice 定義了玩家金庫合約對外提供的功能。
 * @dev 確保此介面中的函式簽名與 PlayerVault.sol 中的實作完全一致。
 */
interface IPlayerVault {
    /**
     * @notice 從遊戲模組向玩家金庫存入獎勵。
     * @param _player 接收獎勵的玩家地址。
     * @param _amount 存入的 SoulShard 數量。
     */
    function deposit(address _player, uint256 _amount) external;

    /**
     * @notice 為遊戲內消費花費金庫內的資金。
     * @dev 只能由在 DungeonCore 中註冊的授權合約呼叫。
     * @param _player 資金被花費的玩家地址。
     * @param _amount 花費的 SoulShard 數量。
     */
    function spendForGame(address _player, uint256 _amount) external;

    /**
     * @notice 回傳遊戲代幣 SoulShard 的合約地址。
     */
    function soulShardToken() external view returns (IERC20);
}
