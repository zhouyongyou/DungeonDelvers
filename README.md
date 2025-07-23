# Dungeon Delvers (地下城探索者) - V15

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Blockchain: BSC](https://img.shields.io/badge/Blockchain-BSC-yellow.svg)](https://www.bscscan.com/)
[![React Version](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://react.dev/)
[![Wagmi](https://img.shields.io/badge/Powered%20by-Wagmi-purple.svg)](https://wagmi.sh/)
[![Performance](https://img.shields.io/badge/Query_Speed-50%25_Faster-green.svg)](https://dungeondelvers.xyz/)
[![Config Management](https://img.shields.io/badge/Config-Enterprise_Grade-blue.svg)](https://dungeondelvers.xyz/)

歡迎來到 Dungeon Delvers 的全新紀元！本專案配備**企業級配置管理系統**和**極速查詢優化**，從原生 JavaScript 架構全面重構為現代化的 **React + TypeScript** 技術棧，為玩家提供頂級的遊戲體驗，並展示 Web3 DApp 的最佳實踐。

玩家可以招募英雄、鑄造聖物、組建獨一無二的冒險隊伍，深入充滿挑戰的地下城，尋找傳說中的「魂晶」($SoulShard)。

**[➡️ 前往體驗 DApp](https://www.dungeondelvers.xyz/) | [➡️ 閱讀我們的白皮書](https://soulshard.gitbook.io/dungeon-delvers/)**

---

## 📜 目錄
- [🚀 技術亮點](#-技術亮點)
- [✨ 遊戲特色](#-遊戲特色)
- [⚔️ 核心機制](#️-核心機制)
- [💰 經濟模型](#-經濟模型)
- [🛠️ 技術堆疊](#️-技術堆疊)
- [⚡ 快速開始](#-快速開始)
- [🗺️ 專案藍圖](#️-專案藍圖)
- [🙌 如何貢獻](#-如何貢獻)
- [📄 版權許可](#-版權許可)

---

## 🚀 技術亮點

### 🔧 企業級配置管理
- **動態配置載入**: CDN 配置系統，無需重新部署即可更新合約地址和網路設定
- **環境變數優化**: 從 20+ 個簡化至 5-9 個變數，大幅簡化部署流程
- **分層安全架構**: 前端極速響應 + 後端穩定保護的混合策略

### ⚡ 突破性效能優化
- **查詢速度提升 50%**: 使用 The Graph 付費去中心化網路，告別慢速查詢
- **RPC 響應提升 50%**: 智能負載均衡 + 直連優化，毫秒級響應體驗
- **五重冗餘保障**: 多 API keys 自動輪換，99.9% 服務可用性

### 🛡️ 混合安全策略
- **域名限制保護**: 所有 API keys 均配置白名單域名控制
- **智能後備系統**: 自動故障轉移機制，單點故障零影響
- **零停機更新**: 配置熱更新支援，維護期間服務不中斷

### 🎯 開發者體驗
- **30 秒快速設置**: 只需配置 WalletConnect Project ID 即可啟動
- **完整部署文檔**: 包含 Vercel 和 Render 的最佳實踐配置
- **智能錯誤處理**: 詳細的故障排除指南和監控面板

---

## ✨ 遊戲特色

* **真正的資產所有權**: 您的英雄、聖物和隊伍都是記錄在區塊鏈上的 NFT，由您 100% 擁有。
* **可持續的經濟模型**: 透過 U 本位定價、多維度動態稅率和多元的代幣消耗場景，建立一個穩定的遊戲經濟體。
* **深度策略玩法**:
    * **疲勞系統**: 隊伍在遠征後會累積疲勞度，降低有效戰力，玩家需要在「繼續冒險」和「花費代幣休息」之間做出策略選擇。
    * **升星祭壇**: 消耗低階 NFT 以機率性地合成更高星等的資產，為所有 NFT 提供長期價值。
* **動態鏈上身份**: 玩家的成就將被記錄在一個不可轉讓的靈魂綁定代幣 (SBT) 中，並以靜態圖片的形式，直觀地展示您的等級與榮譽。
* **現代化的 DApp 體驗**: 採用 React + TypeScript 開發，提供即時的鏈上事件反饋、非阻塞式交易追蹤和精美的深淺色主題切換。

---

## ⚔️ 核心機制

我們的 V3 架構圍繞多個核心的 ERC721 智能合約構建，實現了資產與邏輯的高度模組化。

1.  **核心資產 (NFTs)**:
    * **英雄 (Hero)**: 隊伍的戰力來源。
    * **聖物 (Relic)**: 決定隊伍可容納的英雄數量。
    * **隊伍 (Party)**: 由英雄和聖物組成的複合型 NFT，是進行遠征的主體。

2.  **遊戲循環 (Gameplay Loop)**:
    * **派遣遠征** -> **獲取獎勵 (代幣+經驗)** -> **進入冷卻與疲勞** -> **休息恢復** -> **重複循環**。

3.  **玩家進程 (Player Progression)**:
    * **玩家檔案 (SBT)**: 首次獲得經驗時自動鑄造，記錄等級與成就。
    * **VIP 卡 (SBT)**: 透過質押 `$SoulShard` 提升等級，享受稅率減免和成功率加成。

---

## 💰 經濟模型

我們的經濟核心是 U 本位定價與多維度的動態稅率系統。

* **產出**: `$SoulShard` 的唯一產出途徑是**地下城遠征**，獎勵錨定美元價值。
* **消耗**: 主要消耗場景包括 NFT 鑄造、探索費用、隊伍休息、NFT 升星。
* **動態稅率**: 玩家從遊戲內金庫提現時，會觸發動態稅率。最終稅率由**提現金額、時間間隔、VIP 等級、玩家等級**等多個因素共同決定，旨在鼓勵長期參與和複投。
* **邀請系統**: 成功邀請好友可從其提現金額中賺取佣金。

---

## 🛠️ 技術堆疊

### 核心技術
* **區塊鏈**: 幣安智能鏈 (Binance Smart Chain, BSC)
* **智能合約**: Solidity ^0.8.20, OpenZeppelin
* **前端框架**: [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **建構工具**: [Vite](https://vitejs.dev/) (極速熱更新)

### Web3 整合
* [**Wagmi v2**](https://wagmi.sh/): 現代化 React Hooks，處理錢包連接和合約互動
* [**viem**](https://viem.sh/): 輕量、高效、型別安全的以太坊客戶端
* **智能 RPC 管理**: 自動負載均衡和故障轉移

### 狀態管理與 UI
* **非同步狀態**: [@tanstack/react-query](https://tanstack.com/query/latest)
* **全域狀態**: [Zustand](https://github.com/pmndrs/zustand)  
* **樣式系統**: [Tailwind CSS](https://tailwindcss.com/)

### 基礎設施
* **配置管理**: CDN 動態載入系統
* **查詢優化**: The Graph 去中心化網路
* **部署平台**: Vercel (前端) + Render (後端)

---

## ⚡ 快速開始

### 🚀 30 秒設置（推薦）

1. **Clone 並安裝**
   ```bash
   git clone https://github.com/your-username/dungeon-delvers.git
   cd DungeonDelvers
   npm install
   ```

2. **極簡環境變數配置**
   ```bash
   # 只需要設置 WalletConnect Project ID
   echo "VITE_WALLETCONNECT_PROJECT_ID=your_project_id" > .env
   ```

3. **啟動開發服務器**
   ```bash
   npm run dev
   ```
   🎉 就這麼簡單！其他配置都會自動從 CDN 載入。

### 🔧 進階配置（獲得最佳體驗）

想要極速的本地開發體驗？設置額外的環境變數：

```bash
# 極速查詢（The Graph 付費網路）
VITE_THE_GRAPH_NETWORK_URL=https://gateway.thegraph.com/api/YOUR_API_KEY/subgraphs/id/...
VITE_USE_DECENTRALIZED_GRAPH=true

# 高速 RPC（Alchemy 直連）
VITE_ALCHEMY_KEY_PUBLIC=your_alchemy_key

# 開發者資訊顯示
VITE_DEVELOPER_ADDRESS=0x10925A7138649C7E1794CE646182eeb5BF8ba647
```

📖 **詳細配置指南**: 查看 [VERCEL_ENV_COMPLETE.md](./VERCEL_ENV_COMPLETE.md) 了解完整的配置選項和最佳實踐。

### 🏗️ 專案結構

```
src/
├── components/      # React 組件
│   ├── ui/         # 基礎 UI 組件  
│   └── layout/     # 佈局組件
├── config/         # 配置管理
│   ├── contracts.ts # 智能合約配置
│   └── env.ts      # 環境變數管理
├── hooks/          # 自定義 React Hooks
├── utils/          # 工具函數
└── api/            # API 端點（Vercel Functions）
```

---

## 🗺️ 專案藍圖

### ✅ 已完成（V15 版本）
* **企業級技術基礎**
  * [x] 完成 V15 合約架構部署
  * [x] 推出 React + TypeScript 前端
  * [x] 實施企業級配置管理系統
  * [x] 達成 50% 查詢效能提升
  * [x] 建立混合安全策略架構

### 🚀 進行中（2025 Q3-Q4）
* **遊戲核心功能**
  * [ ] 啟動創世 NFT 發售
  * [ ] 建立 $SoulShard 流動性池
  * [ ] 開放地城探索功能
  * [ ] 推出 VIP 質押系統

### 🎯 下一階段（2026）
* **生態擴展**
  * [ ] 裝備 NFT 系統上線
  * [ ] NFT 二級市場交易
  * [ ] PVE 世界 Boss 挑戰
  * [ ] PVP 競技場模式
  * [ ] 社群治理 (DAO) 過渡

### 🔬 技術演進
* **效能優化**
  * [ ] 實施 Layer 2 解決方案
  * [ ] 導入 Account Abstraction
  * [ ] 優化 Gas 使用效率
* **開發者體驗**
  * [ ] 開源配置管理系統
  * [ ] 建立 Web3 最佳實踐文檔
  * [ ] 推出開發者工具包

---

## 🙌 如何貢獻

我們歡迎所有形式的貢獻！Dungeon Delvers 不只是一個遊戲，更是 Web3 技術創新的展示平台。

### 💻 技術貢獻
- **效能優化**: 幫助我們進一步提升查詢和 RPC 效能
- **配置管理**: 改進我們的企業級配置系統
- **開發者工具**: 創建更好的調試和監控工具

### 🎮 遊戲開發
- **UI/UX 改進**: 提升用戶體驗和介面設計
- **功能開發**: 實現新的遊戲機制和特色
- **測試**: 幫助發現和修復 bug

### 📖 文檔與教育
- **最佳實踐文檔**: 分享 Web3 開發經驗
- **教學內容**: 創建技術教程和指南
- **翻譯**: 幫助項目國際化

**開始貢獻**: Fork 本專案，創建 feature branch，並提交 Pull Request。我們會盡快 review！

---

## 📄 版權許可

本專案採用 [MIT License](https://opensource.org/licenses/MIT) 許可。
