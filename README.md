# Dungeon Delvers (地下城探索者) - 新紀元

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Blockchain: BSC](https://img.shields.io/badge/Blockchain-BSC-yellow.svg)](https://www.bscscan.com/)
[![React Version](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://react.dev/)
[![Wagmi](https://img.shields.io/badge/Powered%20by-Wagmi-purple.svg)](https://wagmi.sh/)

歡迎來到 Dungeon Delvers 的全新紀元！本專案已從原生 JavaScript 架構，全面重構為現代化的 **React + TypeScript** 技術棧，旨在為玩家提供更流暢、更可靠的遊戲體驗，並為開發者展示 Web3 DApp 的最佳實踐。

玩家可以招募英雄、鑄造聖物、組建獨一無二的冒險隊伍，深入充滿挑戰的地下城，尋找傳說中的「魂晶」($SoulShard)。

**[➡️ 前往體驗 DApp](https://www.soulshard.fun/) | [➡️ 閱讀我們的白皮書 (GitBook)](https://your-gitbook-link.com)**

---

## 📜 目錄
- [✨ 主要功能](#-主要功能)
- [⚔️ 核心機制 (V3)](#️-核心機制-v3)
- [💰 經濟模型](#-經濟模型)
- [🛠️ 技術堆疊](#️-技術堆疊)
- [🚀 開始使用](#-開始使用)
- [🗺️ 專案藍圖 (Roadmap)](#️-專案藍圖-roadmap)
- [🙌 如何貢獻](#-如何貢獻)
- [📄 版權許可](#-版權許可)

---

## ✨ 主要功能

* **無縫錢包整合**: 採用 Wagmi Hooks，輕鬆連接 MetaMask 等多種錢包，並提供一鍵切換 BSC 主網與測試網的功能。
* **NFT 鑄造與批量操作**:
    * **單個鑄造**: 玩家可使用遊戲代幣 `$SoulShard` 鑄造隨機屬性的「英雄」與「聖物」。
    * **批量鑄造**: 提供數量選擇器，透過前端腳本輔助，實現一次發起多筆鑄造交易，極大提升高階玩家的體驗。
    * **優化的使用者體驗**: 整個鑄造流程提供清晰的、多步驟的進度反饋（檢查授權 -> 批准中 -> 鑄造中），緩解使用者在等待區塊鏈確認時的焦慮。
* **智慧資產儀表板**:
    * **資產統計**: 清晰展示玩家擁有的英雄/聖物總數量、英雄總戰力等關鍵數據。
    * **稀有度篩選**: 提供星級篩選器，讓玩家可以方便地管理和檢視自己的 NFT 資產。
* **NFT 隊伍系統**:
    * **創建隊伍**: 自由組合英雄和聖物，創建一個全新的「隊伍 NFT」。內建戰力限制檢查，確保隊伍的基礎強度。
    * **解散隊伍**: 允許玩家銷毀「隊伍 NFT」，並安全地取回原先投入的所有英雄和聖物。
* **沉浸式地下城遠征**:
    * **派遣隊伍**: 選擇隊伍，支付少量儲備和 BNB 探索費用後，即可派遣至不同難度的地下城。
    * **戰報系統**: 遠征完成後，會彈出一個內容豐富、視覺效果出色的「戰報」彈窗，明確告知成功或失敗，並顯示獲得的獎勵。
* **DApp 指揮中心 (管理後台)**:
    * 一個僅限合約擁有者訪問的強大後台，可遠端、即時地調整遊戲核心經濟參數（鑄造價格、獎勵倍率、地城難度等）、免費鑄造 NFT、提取金庫資金。
* **高階使用者體驗**:
    * **即時反饋**: 應用程式即時監聽鏈上事件，當交易完成後，相關 UI 會自動刷新，無需手動操作。
    * **主題切換**: 內建精美的深色/淺色模式，並提供一鍵切換功能，滿足不同用戶的視覺偏好。

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
2.  **遠征成本**: 每次遠征前，都必須消耗 `$SoulShard` 購買「儲備」，並支付少量 BNB 作為探索費用。
3.  **動態稅率**: 這是抑制通膨的關鍵機制。
    * 玩家的獎勵首先會進入一個「個人金庫」。
    * 當玩家從金庫「提現 (Withdraw)」到錢包時，會觸發動態稅率。
    * **首次提現免稅**。
    * 之後的提現，稅率從 30% 開始，每隔 24 小時降低 10%，72 小時後可再次免稅。

---

## 🛠️ 技術堆疊

* **區塊鏈**: 幣安智能鏈 (Binance Smart Chain, BSC)
* **智能合約**: Solidity ^0.8.19, OpenZeppelin
* **隨機數**: Chainlink VRF v2.5
* **前端框架**: [React](https://react.dev/)
* **程式語言**: [TypeScript](https://www.typescriptlang.org/)
* **建構工具**: [Vite](https://vitejs.dev/)
* **區塊鏈互動**:
    * [**Wagmi**](https://wagmi.sh/): 提供一系列強大的 React Hooks，用於處理錢包連接、合約互動、交易簽署等所有 Web3 相關操作。
    * [**viem**](https://viem.sh/): 一個輕量、高效、型別安全的以太坊客戶端，作為 Wagmi 的底層依賴。
* **非同步狀態管理**: [@tanstack/react-query](https://tanstack.com/query/latest) (由 Wagmi 內建並推薦使用)
* **CSS 框架**: [Tailwind CSS](https://tailwindcss.com/)

---

## 🚀 開始使用

1.  **Clone the repo**
    ```sh
    git clone [https://github.com/your-username/dungeon-delvers-react.git](https://github.com/your-username/dungeon-delvers-react.git)
    cd dungeon-delvers-react
    ```
2.  **安裝依賴**
    ```sh
    npm install
    ```
3.  **配置環境變數**
    在專案根目錄下，複製 `.env.example` 檔案並重新命名為 `.env.local`。接著，打開 `.env.local` 檔案，填入您自己的 RPC URL 和智慧合約地址。
4.  **啟動開發伺服器**
    ```sh
    npm run dev
    ```

---

## 🗺️ 專案藍圖 (Roadmap)

**Q3 2025: V3 紀元啟動**
* [x] 完成 V3 合約架構開發與審計。
* [x] 完成 DApp 前端從原生 JS 到 React/TypeScript 的現代化重構。
* [ ] 啟動創世 NFT 發售。
* [ ] 建立流動性池 (LP)。

**Q4 2025: 遊戲性擴展**
* [ ] **(規劃中)** NFT「銷毀/回收」機制上線，增加代幣消耗場景。
* [ ] **(規劃中)** 推出英雄「升級」或「合成」系統。
* [ ] 開放 NFT 二級市場交易。

**2026: 生態深化**
* [ ] PVE 世界 Boss 挑戰模式。
* [ ] 探索 PVP 競技場模式。
* [ ] 探索可升級合約模式以進行後續迭代。
* [ ] 逐步過渡到社群治理 (DAO)。

---

## 🙌 如何貢獻

我們歡迎所有形式的貢獻！請 Fork 本專案並提交 Pull Request。

---

## 📄 版權許可

本專案採用 [MIT License](https://opensource.org/licenses/MIT) 許可。