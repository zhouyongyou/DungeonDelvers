# Dungeon Delvers (地下城探索者) - 新紀元

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Blockchain: BSC](https://img.shields.io/badge/Blockchain-BSC-yellow.svg)](https://www.bscscan.com/)
[![Solidity Version](https://img.shields.io/badge/Solidity-^0.8.19-blue.svg)](https://soliditylang.org/)

歡迎來到 Dungeon Delvers 的全新紀元！這是一款基於區塊鏈的奇幻風格 NFT 遊戲，玩家可以招募英雄、鑄造聖物、組建獨一無二的冒險隊伍，深入充滿挑戰的地下城，尋找傳說中的「魂晶」($SoulShard)。

**[➡️ 前往體驗 DApp](https://www.soulshard.fun/) | [➡️ 閱讀我們的白皮書 (GitBook)](https://your-gitbook-link.com)**

---

## 📜 目錄
- [關於專案](#-關於專案)
- [核心機制 (V3)](#️-核心機制-v3)
- [經濟模型](#-經濟模型)
- [技術堆疊](#-技術堆疊)
- [開始使用](#-開始使用)
- [專案藍圖 (Roadmap)](#️-專案藍圖-roadmap)
- [如何貢獻](#-如何貢獻)
- [版權許可](#-版權許可)

---

## 🏰 關於專案

Dungeon Delvers 的目標是成為一個可持續、由社群驅動的 Web3 遊戲生態。我們致力於將傳統遊戲的樂趣與 NFT 的真正所有權、DeFi 的經濟激勵相結合，為玩家創造一個既能娛樂又能創造價值的奇幻世界。

---

## ⚔️ 核心機制 (V3)

我們的 V3 架構圍繞四個核心的 ERC721 智能合約構建，實現了資產與邏輯的高度模組化。

### **英雄 (Hero.sol)**
* **ERC721 NFT**: 每一位英雄都是一個獨一無二的 NFT。
* **核心屬性**:
    * **戰力 (Power)**: 英雄的基礎攻擊力，隨機生成，是挑戰高等級地城的關鍵。

### **聖物 (Relic.sol)**
* **ERC721 NFT**: 每一件聖物也是一個獨一無二的 NFT。
* **核心屬性**:
    * **容量 (Capacity)**: 聖物的核心價值，決定了您的隊伍可以容納多少位英雄。

### **隊伍 (Party.sol)**
* **ERC721 NFT**: 將多個英雄和聖物「打包」成一個全新的、可交易的隊伍 NFT。
* **核心功能**:
    * **組建**: 玩家可以將自己擁有的英雄和聖物組建成一支隊伍。
    * **鎖定**: 當隊伍在遠征或有儲備時，其 NFT 會被鎖定，無法轉移或解散，確保遊戲機制的公平性。

### **地下城核心 (DungeonCore.sol)**
這是整個遊戲的大腦，處理所有的核心循環：
1.  **遠征 (Expedition)**: 玩家為選定的隊伍購買「儲備 (Provisions)」，然後派遣他們進入有戰力門檻的地城。
2.  **成功率**: 遠征的成功與否由 Chainlink VRF 提供的可驗證隨機數決定，確保絕對公平。
3.  **獎勵**: 成功後獲得的 `$SoulShard` 獎勵，會先存入隊伍的「待結算池」。
4.  **冷卻 (Cooldown)**: 無論成功與否，隊伍在遠征後都將進入 24 小時的冷卻期。

---

## 💰 經濟模型

我們的經濟核心是 U 本位定價與兩階段提取，旨在維持 `$SoulShard` 的長期價值。

### **產出 (Earning 💧)**
* **地下城遠征**: 這是 `$SoulShard` 的唯一產出途徑。所有獎勵都錨定 USD 價值，不受幣價波動影響，穩定玩家回報預期。

### **消耗 / 鎖倉 (Burning / Locking 🕳️)**
1.  **鑄造成本**: 招募新英雄、鑄造新聖物都需要消耗與固定 USD 等值的 `$SoulShard`。
2.  **遠征成本**: 每次遠征前，都必須消耗 `$SoulShard` 購買「儲備」。
3.  **動態稅率**: 這是抑制通膨的關鍵機制。
    * 玩家的獎勵首先會進入一個「個人金庫」。
    * 當玩家從金庫「提現 (Withdraw)」到錢包時，會觸發動態稅率。
    * **首次提現免稅**。
    * 之後的提現，稅率從 30% 開始，每隔 24 小時降低 10%，72 小時後可再次免稅。

---

## 💻 技術堆疊

* **區塊鏈**: 幣安智能鏈 (Binance Smart Chain, BSC)
* **智能合約**: Solidity ^0.8.19, OpenZeppelin
* **隨機數**: Chainlink VRF v2.5
* **前端**: HTML5, Tailwind CSS, Vanilla JavaScript
* **Web3 連接**: Ethers.js
* **數據索引 (推薦)**: TheGraph

---

## 🚀 開始使用

1.  **Clone the repo**
    ```sh
    git clone [https://github.com/zhouyongyou/DungeonDelvers.git](https://github.com/zhouyongyou/DungeonDelvers.git)
    ```
2.  **安裝依賴** (如果前端專案有 package.json)
    ```sh
    npm install
    ```
3.  **配置合約地址**
    打開 `script.js` 文件，並將頂部的合約地址常量替換為您自己部署的地址。
4.  **在瀏覽器中打開 `index.html`**

---

## 🗺️ 專案藍圖 (Roadmap)

**Q3 2025: V3 紀元啟動**
* [x] 完成 V3 合約架構開發與審計。
* [x] 推出全新 DApp 前端。
* [ ] 啟動創世 NFT 發售。
* [ ] 建立流動性池 (LP)。

**Q4 2025: 遊戲性擴展**
* [ ] **(規劃中)** 裝備 NFT 系統上線，增加新的消耗場景。
* [ ] **(規劃中)** 推出英雄「升級」或「合成」系統。
* [ ] 開放 NFT 二級市場交易。

**2026: 生態深化**
* [ ] PVE 世界 Boss 挑戰模式。
* [ ] 探索 PVP 競技場模式。
* [ ] 逐步過渡到社群治理 (DAO)。

---

## 🙌 如何貢獻

我們歡迎所有形式的貢獻！請 Fork 本專案並提交 Pull Request。

---

## 📄 版權許可

本專案採用 [MIT License](https://opensource.org/licenses/MIT) 許可。
