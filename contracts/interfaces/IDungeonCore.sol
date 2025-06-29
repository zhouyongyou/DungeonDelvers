// contracts/interfaces/IDungeonCore.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// 雖然這裡可以寫 IPlayerVault，但為了保持介面單純，直接用 address 即可
// import "./IPlayerVault.sol"; 

interface IDungeonCore {
    // 您可以保留舊的函式宣告，以防萬一，但根據您的新架構，它們可能不再需要
    // function getSoulShardAmountForUSD(uint256 _amountUSD) external view returns (uint256 soulShardAmount);
    // function spendFromVault(address _player, uint256 _amount) external;
    // function isSpenderApproved(address _owner, address _spender) external view returns (bool);
    
    // --- ↓↓↓ 為所有 public 狀態變數新增的 Getter 函式宣告 ↓↓↓ ---

    function oracle() external view returns (address);
    
    function playerVault() external view returns (address);

    function dungeonMaster() external view returns (address);

    function heroContract() external view returns (address);

    function relicContract() external view returns (address);

    function partyContract() external view returns (address);

    function playerProfileContract() external view returns (address);

    function vipStakingContract() external view returns (address);

    function altarOfAscension() external view returns (address); // <-- 解決您最初問題的關鍵

    function usdToken() external view returns (address);
    
    function owner() external view returns (address); // <-- Ownable 合約的 owner() 函式也需要加入
}