# 5. 技術實現 (Technology)

## 5.1 區塊鏈技術堆疊

* **區塊鏈**: 幣安智能鏈 (Binance Smart Chain, BSC)
* **智能合約**: Solidity ^0.8.20, OpenZeppelin
* **前端框架**: [React](https://react.dev/) 18.3.1
* **程式語言**: [TypeScript](https://www.typescriptlang.org/)
* **建構工具**: [Vite](https://vitejs.dev/)
* **區塊鏈互動**:
  * [**Wagmi**](https://wagmi.sh/): 提供強大的 React Hooks，處理錢包連接、合約互動、交易簽署等 Web3 操作
  * [**viem**](https://viem.sh/): 輕量、高效、型別安全的以太坊客戶端
* **狀態管理**:
  * [**@tanstack/react-query**](https://tanstack.com/query/latest): 非同步狀態管理
  * [**Zustand**](https://github.com/pmndrs/zustand): 全域狀態管理
* **CSS 框架**: [Tailwind CSS](https://tailwindcss.com/)

## 5.2 智能合約架構

我們的 V3 架構採用模組化設計，主要合約包括：

* **英雄合約 (Hero.sol)**: 管理英雄 NFT 的鑄造和屬性
* **聖物合約 (Relic.sol)**: 管理聖物 NFT 的鑄造和容量
* **隊伍合約 (Party.sol)**: 管理複合型隊伍 NFT
* **玩家檔案合約 (PlayerProfile.sol)**: 管理玩家經驗和等級 SBT
* **VIP 質押合約 (VIPStaking.sol)**: 管理 VIP 卡質押和等級
* **地下城主控合約 (DungeonMaster.sol)**: 管理遠征邏輯和獎勵
* **玩家金庫合約 (PlayerVault.sol)**: 管理玩家獎勵和動態稅率
* **升星祭壇合約 (AltarOfAscension.sol)**: 管理 NFT 升級系統

## 5.3 安全與公平性保障
* **核心安全與公平性保障**:
  * **隊伍鎖定機制 (Party Lock)**: 為防止玩家在遠征期間轉移或分解資產，`Party.sol` 合約會暫時鎖定出征中的隊伍 NFT。
  * **緊急暫停機制 (Pausable)**: 所有核心業務合約都繼承了 OpenZeppelin 的 `Pausable` 模組，賦予擁有者在遭遇潛在威脅時暫停合約核心功能的能力。
  * **鏈上隨機性**: 遊戲中所有的關鍵隨機事件，例如 NFT 屬性生成、遠征成功率、升星結果等，都由鏈上可驗證的偽隨機數生成，確保了過程的透明與防篡改。
