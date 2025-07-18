# 🏰 DungeonDelvers - Web3 NFT 冒險遊戲

<div align="center">
  <img src="./assets/images/FOUR-logo4.png" alt="DungeonDelvers Logo" width="200"/>
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![BSC Chain](https://img.shields.io/badge/Chain-BSC-yellow)](https://www.bnbchain.org/)
  [![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178c6)](https://www.typescriptlang.org/)
  [![Vite](https://img.shields.io/badge/Vite-5.0-646cff)](https://vitejs.dev/)
</div>

## 📖 目錄

- [專案簡介](#專案簡介)
- [核心功能](#核心功能)
- [技術架構](#技術架構)
- [快速開始](#快速開始)
- [開發指南](#開發指南)
- [智能合約](#智能合約)
- [API 文檔](#api-文檔)
- [部署指南](#部署指南)
- [貢獻指南](#貢獻指南)
- [授權協議](#授權協議)

## 🎮 專案簡介

DungeonDelvers 是一個基於 BNB Smart Chain 的創新 Web3 NFT 遊戲生態系統。玩家可以收集英雄、遺物，組建隊伍，探索地下城，並通過 VIP 系統獲得額外收益。

### 🌟 主要特色

- **NFT 收藏系統**: 獨特的英雄、遺物和隊伍 NFT
- **地下城探索**: 風險與收益並存的冒險機制
- **VIP 質押系統**: 通過質押 Soul Shard 代幣獲得特權
- **動態 SVG**: 鏈上生成的 NFT 圖像
- **去中心化**: 完全鏈上的遊戲邏輯

## 🚀 核心功能

### 1. NFT 系統
- **英雄 (Hero)**: 具有不同稀有度和屬性的戰鬥單位
- **遺物 (Relic)**: 增強英雄能力的裝備道具
- **隊伍 (Party)**: 組合英雄和遺物形成的戰鬥小隊
- **玩家檔案 (Profile)**: 記錄玩家成就和統計數據

### 2. 遊戲機制
- **地下城探索**: 派遣隊伍探索獲取獎勵
- **升級系統**: 通過祭壇提升 NFT 稀有度
- **疲勞系統**: 平衡遊戲節奏，防止過度遊玩
- **推薦系統**: 邀請好友獲得獎勵

### 3. 經濟系統
- **Soul Shard**: 遊戲內主要代幣
- **VIP 質押**: 質押獲得稅率減免和其他特權
- **市場整合**: 支持 OKX 等 NFT 市場

## 🛠 技術架構

### 前端技術棧
```
React 18.2 + TypeScript 5.2 + Vite 5.0
├── Wagmi - Web3 連接和合約交互
├── TanStack Query - 數據獲取和快取
├── Tailwind CSS - 樣式框架
├── Framer Motion - 動畫效果
└── i18next - 國際化支持
```

### 後端服務
```
Node.js + Express
├── IPFS - NFT 元數據存儲
├── The Graph - 區塊鏈數據索引
├── PostgreSQL - 關聯數據存儲
└── Redis - 快取層
```

### 智能合約
```
Solidity 0.8.20
├── 核心合約 - DungeonCore, Oracle, PlayerVault
├── NFT 合約 - Hero, Relic, Party
├── 遊戲合約 - DungeonMaster, AltarOfAscension
└── 經濟合約 - VIPStaking, SoulShard
```

## 🏁 快速開始

### 環境要求
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git

### 安裝步驟

1. **克隆專案**
```bash
git clone https://github.com/yourusername/DungeonDelvers.git
cd DungeonDelvers
```

2. **安裝依賴**
```bash
npm install
```

3. **環境配置**
```bash
cp .env.example .env
# 編輯 .env 文件，配置必要的環境變量
```

4. **啟動開發服務器**
```bash
npm run dev
```

5. **訪問應用**
```
http://localhost:5173
```

## 💻 開發指南

### 項目結構
```
DungeonDelvers/
├── src/
│   ├── components/     # React 組件
│   ├── pages/         # 頁面組件
│   ├── hooks/         # 自定義 Hooks
│   ├── utils/         # 工具函數
│   ├── config/        # 配置文件
│   ├── types/         # TypeScript 類型
│   └── api/           # API 接口
├── contracts/         # Solidity 智能合約
├── public/           # 靜態資源
├── DDgraphql/        # The Graph 子圖
└── scripts/          # 部署和管理腳本
```

### 開發命令

```bash
# 開發模式
npm run dev

# 構建生產版本
npm run build

# 預覽生產構建
npm run preview

# 運行測試
npm run test

# 代碼檢查
npm run lint

# 類型檢查
npm run type-check
```

### 代碼規範

- 使用 ESLint + Prettier 進行代碼格式化
- 遵循 TypeScript 嚴格模式
- 組件使用函數式組件 + Hooks
- 提交信息遵循 Conventional Commits

## 📜 智能合約

### 主要合約地址 (BSC Mainnet)

| 合約名稱 | 地址 | 版本 |
|---------|------|------|
| DungeonCore | `0x4CbAC0E4AEC9Ef3B11C93805483c23224ed1f118` | v1.3.0 |
| Hero | `0x648fcDf1F59a2598E9F68Ab3210a25a877fAd353` | v1.3.0 |
| Relic | `0x6704d55c8736E373b001D54Ba00A80DBb0eC793B` | v1.3.0 |
| Party | `0x66ea7C0b2bAa497eAF18BE9f3D4459FfC20Ba491` | v1.3.0 |
| VIPStaking | `0x845dE2d044323161703bb0C6fFb1f2CE287AD5BB` | v1.3.2 |

### 合約交互示例

```typescript
import { useContractRead } from 'wagmi';
import { heroContract } from '@/config/contracts';

// 讀取英雄數據
const { data: heroData } = useContractRead({
  ...heroContract,
  functionName: 'getHero',
  args: [tokenId],
});
```

## 🌐 API 文檔

### Metadata API

**基礎 URL**: `https://dungeon-delvers-metadata-server.onrender.com`

#### 獲取 NFT 元數據
```
GET /api/{collection}/{tokenId}.json

示例:
GET /api/hero/1.json
GET /api/relic/42.json
```

#### 獲取玩家資產
```
GET /api/player/{address}/assets?type={nftType}

參數:
- address: 玩家錢包地址
- type: hero | relic | party
```

### The Graph API

**Endpoint**: 配置在環境變量中

```graphql
query GetPlayerData($address: String!) {
  player(id: $address) {
    heroes {
      tokenId
      level
      rarity
    }
    parties {
      tokenId
      totalPower
    }
  }
}
```

## 🚀 部署指南

### 前端部署 (Vercel)

1. Fork 此專案到你的 GitHub
2. 在 Vercel 導入專案
3. 配置環境變量
4. 部署

### 智能合約部署

```bash
# 編譯合約
npx hardhat compile

# 部署到 BSC 測試網
npx hardhat run scripts/deploy.js --network bscTestnet

# 驗證合約
npx hardhat verify --network bscMainnet CONTRACT_ADDRESS
```

### 設置 BaseURI

```bash
# 使用 API 服務器
npm run set-baseuri:api

# 使用 IPFS
npm run set-baseuri:ipfs
```

## 🤝 貢獻指南

我們歡迎所有形式的貢獻！請查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解詳情。

### 貢獻流程

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 報告問題

- 使用 GitHub Issues 報告 bug
- 提供詳細的重現步驟
- 包含錯誤截圖和日誌

## 📄 授權協議

本專案採用 MIT 授權協議 - 查看 [LICENSE](LICENSE) 文件了解詳情。

## 🔗 相關連結

- [官方網站](https://dungeondelvers.xyz)
- [文檔](https://soulshard.gitbook.io/dungeon-delvers/)
- [Twitter](https://twitter.com/dungeondelvers)
- [Telegram](https://t.me/soulshard_BSC)
- [Discord](https://discord.gg/dungeondelvers)

## 👥 團隊

- **項目負責人**: [Your Name]
- **智能合約開發**: [Contract Dev]
- **前端開發**: [Frontend Dev]
- **遊戲設計**: [Game Designer]

---

<div align="center">
  Made with ❤️ by DungeonDelvers Team
</div>