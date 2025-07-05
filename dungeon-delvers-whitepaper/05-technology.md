# 5. 技術實現 (Technology)

* **區塊鏈**: 幣安智能鏈 (Binance Smart Chain, BSC)
* **智能合約**: Solidity ^0.8.20, OpenZeppelin
* **前端框架**: React, TypeScript, Vite
* **Web3 連接**: Wagmi, Viem
* **核心安全與公平性保障**:
  * **隊伍鎖定機制 (Party Lock)**: 為防止玩家在遠征期間轉移或分解資產，`Party.sol` 合約會暫時鎖定出征中的隊伍 NFT。
  * **緊急暫停機制 (Pausable)**: 所有核心業務合約都繼承了 OpenZeppelin 的 `Pausable` 模組，賦予擁有者在遭遇潛在威脅時暫停合約核心功能的能力。
  * **鏈上隨機性**: 遊戲中所有的關鍵隨機事件，例如 NFT 屬性生成、遠征成功率、升星結果等，都由鏈上可驗證的偽隨機數生成，確保了過程的透明與防篡改。
