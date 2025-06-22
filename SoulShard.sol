// ======================================================
// 檔案：SoulShard.sol
// 功能：遊戲的核心代幣 ($SoulShard)
// 狀態：最終版，無需修改。
// ======================================================

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SoulShard is ERC20, Ownable {
    constructor() ERC20("SoulShard", "SOUL") Ownable(msg.sender) {
        // 初始鑄造 10 億個代幣給合約部署者
        _mint(msg.sender, 1000000000 * 10**decimals());
    }
}
