// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IPlayerVault.sol";

interface IDungeonCore {
    /**
     * @notice 查詢用 USD 計價的商品對應需要多少 SoulShard。
     * @dev 由 Hero 和 Relic 合約在鑄造時呼叫。
     * @param _amountUSD 以 1e18 為單位的 USD 數量。
     * @return soulShardAmount 等值的 SoulShard 數量。
     */
    function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256 soulShardAmount);

    /**
     * @notice 從玩家的遊戲內金庫中花費 SoulShard。
     * @dev 由 Hero 和 Relic 合約在選擇「金庫支付」時呼叫。
     * @param _player 玩家地址。
     * @param _amount 要花費的數量。
     */
    function spendFromVault(address _player, uint256 _amount) external;

    /**
     * @notice 檢查一個地址是否被授權可以花費另一個玩家的金庫餘額。
     * @dev 由 PlayerVault 內部呼叫，以驗證 spendFromVault 的呼叫者權限。
     * @param _owner 金庫擁有者地址。
     * @param _spender 嘗試花費的合約地址。
     * @return bool 是否已授權。
     */
    function isSpenderApproved(address _owner, address _spender) external view returns (bool);
    
    /**
     * @notice 回傳 PlayerVault 合約的介面。
     * @dev 讓其他合約可以取得 SoulShard 的地址。
     */
    function playerVault() external view returns (IPlayerVault);
}
