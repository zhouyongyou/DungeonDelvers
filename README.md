# Dungeon Delvers (地下城探索者)

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Discord](https://img.shields.io/discord/8888888888888888.svg?label=Discord&logo=Discord&color=7289DA)](https://discord.gg/your-invite-link)
[![Twitter Follow](https://img.shields.io/twitter/follow/your-twitter-handle?style=social)](https://twitter.com/your-twitter-handle)

歡迎來到 Dungeon Delvers 的世界！這是一款基於區塊鏈的奇幻風格 NFT 遊戲，玩家可以招募英雄、組建隊伍，深入危險的地下城尋找蘊含著世界能量的「魂晶」($SoulShard)。

**[➡️ 前往體驗互動式網頁應用](https://your-live-app-link.com) | [➡️ 閱讀我們的完整白皮書](https://your-website.com/whitepaper)**

---

## 📜 目錄

- [關於專案](#-關於專案)
- [核心機制](#️-核心機制)
- [經濟模型 (V2.0)](#-經濟模型-v20)
- [技術堆疊](#-技術堆疊)
- [開始使用](#-開始使用)
- [專案藍圖 (Roadmap)](#️-專案藍圖-roadmap)
- [如何貢獻](#-如何貢獻)
- [版權許可](#-版權許可)
- [聯繫我們](#-聯繫我們)

---

## 🏰 關於專案

Dungeon Delvers 的目標是成為區塊鏈上最宏大的奇幻冒險遊戲。我們致力於將傳統遊戲的樂趣與 NFT 的所有權、DeFi 的經濟激勵相結合，創造一個可持續、由社群驅動的遊戲生態。

---

## ⚔️ 核心機制

### **英雄 (Heroes)**
英雄是您隊伍中的主要戰力。他們擁有不同的稀有度和核心屬性：
* **戰力 (Power):** 英雄的基礎攻擊能力，直接影響地下城收益。
* **疲勞度 (Fatigue):** **[V2.0 新增]** 英雄的體力值 (100/100)，每次遠征都會消耗，是維持產出的關鍵成本。

### **聖物 (Relics)**
聖物是開啟地下城遠征的鑰匙，它決定了您的隊伍可以容納多少位英雄。

### **隊伍 (Party) & 地下城 (Dungeons)**
一個「隊伍」是由一件聖物和多位英雄組合而成。隊伍的總戰力決定了可以挑戰的地下城等級。成功完成遠征將獲得 `$SoulShard`，但會消耗英雄的疲勞度。

---

## 💰 經濟模型 (V2.0)

我們的經濟核心是建立一個可持續的產出與消耗閉環。

### **產出 (Earning 💧)**
* **地下城遠征：** 這是 `$SoulShard` 的唯一產出途徑。

### **消耗 (Burning 🕳️)**
1.  **資產擴展消耗:**
    * 在「英雄酒館」消耗 1900 `$SoulShard` 招募新英雄。
    * 在「古代熔爐」消耗 9000 `$SoulShard` 鑄造新聖物。
2.  **持續性運營成本:**
    * **[V2.0 核心]** 玩家必須消耗 `$SoulShard` 購買**「食物」**或**「治療藥水」**來恢復英雄的**疲勞度**，否則戰力會下降。這是保證代幣內在需求、抑制通膨的關鍵機制。

---

## 💻 技術堆疊

* **區塊鏈:** 幣安智能鏈 (Binance Smart Chain, BSC)
* **智能合約:** Solidity
* **前端框架:** HTML, Tailwind CSS, Vanilla JavaScript
* **圖表庫:** Chart.js
* **錢包整合:** MetaMask (透過 Web3.js 或 Ethers.js)

---

## 🚀 開始使用

1.  複製此儲存庫
    ```sh
    git clone [https://github.com/zhouyongyou/DungeonDelvers.git](https://github.com/zhouyongyou/DungeonDelvers.git)
    ```
2.  安裝 NPM 套件 (如果需要)
    ```sh
    npm install
    ```
3.  在瀏覽器中打開 `index.html` 文件。

---

## 🗺️ 專案藍圖 (Roadmap)

**Q3 2025: 創世啟動 (V2.0 模型)**
* [x] 智能合約開發與審計 (包含疲勞度機制)
* [x] 互動式網頁應用上線
* [ ] 創世英雄與聖物 NFT 發售

**Q4 2025: 經濟深化**
* [ ] **(已規劃)** 裝備 NFT 系統上線
* [ ] **(已規劃)** 推出裝備「強化」與「鍛造」等消耗機制
* [ ] 開放 NFT 市場

**2026: 遊戲性擴展**
* [ ] **(已規劃)** 推出英雄合成 (Hero Fusion) 系統
* [ ] PVE Boss 挑戰模式
* [ ] 探索社群治理 (DAO)

---

## 🙌 如何貢獻

我們歡迎所有形式的貢獻！請 Fork 本專案並提交 Pull Request。

---

## 📄 版權許可

本專案採用 MIT 許可證。

---

## 📧 聯繫我們

專案連結: [https://github.com/zhouyongyou/DungeonDelvers](https://github.com/zhouyongyou/DungeonDelvers)
