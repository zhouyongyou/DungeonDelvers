# Dungeon Delvers (地下城探索者) - v3.0

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Blockchain: BSC](https://img.shields.io/badge/Blockchain-BSC-yellow.svg)](https://www.bscscan.com/)
[![React Version](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://react.dev/)
[![Wagmi](https://img.shields.io/badge/Powered%20by-Wagmi-purple.svg)](https://wagmi.sh/)

歡迎來到 Dungeon Delvers 的全新紀元！本專案已從原生 JavaScript 架構，全面重構為現代化的 **React + TypeScript** 技術棧，旨在為玩家提供更流暢、更可靠的遊戲體驗，並為開發者展示 Web3 DApp 的最佳實踐。

玩家可以招募英雄、鑄造聖物、組建獨一無二的冒險隊伍，深入充滿挑戰的地下城，尋找傳說中的「魂晶」($SoulShard)。

**[➡️ 前往體驗 DApp](https://www.dungeondelvers.xyz/) | [➡️ 閱讀我們的白皮書](https://soulshard.gitbook.io/dungeon-delvers/)**

---

## 📜 目錄
- [✨ 遊戲特色](#-遊戲特色)
- [⚔️ 核心機制](#️-核心機制)
- [💰 經濟模型](#-經濟模型)
- [🛠️ 技術堆疊](#️-技術堆疊)
- [🚀 本地端啟動](#-本地端啟動)
- [🗺️ 專案藍圖](#️-專案藍圖)
- [🙌 如何貢獻](#-如何貢獻)
- [📄 版權許可](#-版權許可)

---

## ✨ 遊戲特色

* **真正的資產所有權**: 您的英雄、聖物和隊伍都是記錄在區塊鏈上的 NFT，由您 100% 擁有。
* **可持續的經濟模型**: 透過 U 本位定價、多維度動態稅率和多元的代幣消耗場景，建立一個穩定的遊戲經濟體。
* **深度策略玩法**:
    * **疲勞系統**: 隊伍在遠征後會累積疲勞度，降低有效戰力，玩家需要在「繼續冒險」和「花費代幣休息」之間做出策略選擇。
    * **升星祭壇**: 消耗低階 NFT 以機率性地合成更高星等的資產，為所有 NFT 提供長期價值。
* **動態鏈上身份**: 玩家的成就將被記錄在一個不可轉讓的靈魂綁定代幣 (SBT) 中，並以動態 SVG 的形式，直觀地展示您的等級與榮譽。
* **現代化的 DApp 體驗**: 採用 React + TypeScript 開發，提供即時的鏈上事件反饋、非阻塞式交易追蹤和精美的深淺色主題切換。

---

## ⚔️ 核心機制

我們的 V3 架構圍繞多個核心的 ERC721 智能合約構建，實現了資產與邏輯的高度模組化。

1.  **核心資產 (NFTs)**:
    * **英雄 (Hero)**: 隊伍的戰力來源。
    * **聖物 (Relic)**: 決定隊伍可容納的英雄數量。
    * **隊伍 (Party)**: 由英雄和聖物組成的複合型 NFT，是進行遠征的主體。

2.  **遊戲循環 (Gameplay Loop)**:
    * **購買儲備** -> **派遣遠征** -> **獲取獎勵 (代幣+經驗)** -> **進入冷卻與疲勞** -> **休息恢復** -> **重複循環**。

3.  **玩家進程 (Player Progression)**:
    * **玩家檔案 (SBT)**: 首次獲得經驗時自動鑄造，記錄等級與成就。
    * **VIP 卡 (SBT)**: 透過質押 `$SoulShard` 提升等級，享受稅率減免和成功率加成。

---

## 💰 經濟模型

我們的經濟核心是 U 本位定價與多維度的動態稅率系統。

* **產出**: `$SoulShard` 的唯一產出途徑是**地下城遠征**，獎勵錨定美元價值。
* **消耗**: 主要消耗場景包括 NFT 鑄造、購買儲備、隊伍休息、NFT 升星。
* **動態稅率**: 玩家從遊戲內金庫提現時，會觸發動態稅率。最終稅率由**提現金額、時間間隔、VIP 等級、玩家等級**等多個因素共同決定，旨在鼓勵長期參與和複投。
* **邀請系統**: 成功邀請好友可從其提現金額中賺取佣金。

---

## 🛠️ 技術堆疊

* **區塊鏈**: 幣安智能鏈 (Binance Smart Chain, BSC)
* **智能合約**: Solidity ^0.8.20, OpenZeppelin
* **前端框架**: [React](https://react.dev/)
* **程式語言**: [TypeScript](https://www.typescriptlang.org/)
* **建構工具**: [Vite](https://vitejs.dev/)
* **區塊鏈互動**:
    * [**Wagmi**](https://wagmi.sh/): 提供一系列強大的 React Hooks，用於處理錢包連接、合約互動、交易簽署等所有 Web3 相關操作。
    * [**viem**](https://viem.sh/): 一個輕量、高效、型別安全的以太坊客戶端，作為 Wagmi 的底層依賴。
* **非同步狀態管理**: [@tanstack/react-query](https://tanstack.com/query/latest)
* **全域狀態管理**: [Zustand](https://github.com/pmndrs/zustand)
* **CSS 框架**: [Tailwind CSS](https://tailwindcss.com/)

---

## 🚀 本地端啟動

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
    在專案根目錄下，複製 `.env.example` 檔案並重新命名為 `.env`。接著，打開 `.env` 檔案，填入您自己的 RPC URL 和智能合約地址。
4.  **啟動開發伺服器**
    ```sh
    npm run dev
    ```

---

## 🗺️ 專案藍圖

* **Q3 2025: V3 紀元啟動**
    * [x] 完成 V3 合約架構開發與審計。
    * [x] 推出全新 DApp 前端 (React + TypeScript)。
    * [ ] 啟動創世 NFT 發售。
    * [ ] 建立流動性池 (LP)。
* **Q4 2025: 遊戲性擴展**
    * [ ] (規劃中) 裝備 NFT 系統上線。
    * [ ] (規劃中) 開放 NFT 二級市場交易。
* **2026: 生態深化**
    * [ ] PVE 世界 Boss 挑戰模式。
    * [ ] 探索 PVP 競技場模式。
    * [ ] 逐步過渡到社群治理 (DAO)。

---

## 🙌 如何貢獻

我們歡迎所有形式的貢獻！請 Fork 本專案並提交 Pull Request。

---

## 📄 版權許可

本專案採用 [MIT License](https://opensource.org/licenses/MIT) 許可。
