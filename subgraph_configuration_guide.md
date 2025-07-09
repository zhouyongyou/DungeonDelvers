# 子圖配置改進指南

## 🎯 問題解決總結

### 1. networks.json 文件問題
**原始問題：** 您正確地指出了 networks.json 文件疏忽了更新，並且只包含了兩個 NFT 合約地址。

**解決方案：** 
- ✅ 已更新 networks.json 包含所有 8 個合約地址
- ✅ 統一了所有合約的 startBlock 為 53308155
- ✅ 與 subgraph.yaml 中的地址保持一致

### 2. 硬編碼地址問題
**原始問題：** party.ts 中硬編碼了 Hero 和 Relic 合約地址，無法從環境中動態獲取。

**解決方案：**
- ✅ 創建了統一的配置系統 (`src/config.ts`)
- ✅ 支持多網路配置
- ✅ 使用 `dataSource.network()` 動態獲取網路信息
- ✅ 提供了工具函數來管理合約地址

## 🔧 新的配置系統

### 配置文件結構
```
src/
├── config.ts          # 統一的合約地址配置
├── party.ts           # 使用配置系統
├── hero.ts            # 使用配置系統
└── common.ts          # 共用工具函數
```

### 主要功能

1. **網路感知配置**
   ```typescript
   // 自動檢測當前網路
   let network = dataSource.network()
   
   // 返回對應網路的合約地址
   if (network == "bsc") {
       return BSC_ADDRESSES
   }
   ```

2. **統一的地址管理**
   ```typescript
   // 獲取任何合約地址
   import { getHeroContractAddress, getRelicContractAddress } from "./config"
   
   let heroAddress = getHeroContractAddress()
   let relicAddress = getRelicContractAddress()
   ```

3. **實體 ID 標準化**
   ```typescript
   // 統一的 ID 創建方式
   import { createEntityId } from "./config"
   
   let heroId = createEntityId(contractAddress, tokenId)
   ```

## 📋 完整的合約地址配置

### BSC 網路 (當前)
```json
{
  "hero": "0xfc2a24E894236a6169d2353BE430a3d5828111D2",
  "relic": "0xd86245Ddce19E8F94Bc30f0facf7bd111069FAf9",
  "party": "0x4F4796b04e3BD3E8d5B447e32944d8B04eF53EB2",
  "playerProfile": "0xE51ae47bf0f9958a0b35f1830675d88C2c7F5232",
  "vipStaking": "0x8A9943Bb231eC9131d750c7bcf8A4Ae36bd4f0F8",
  "dungeonMaster": "0xe208554A49aDeE49FA774a736C5279A5CB930FB8",
  "playerVault": "0x22ec24B183afd81c69d14ebB9f226D3e0BC75C03",
  "altarOfAscension": "0xd9bE09b96959BEA3e335850b540EC51b841Df9Cc"
}
```

### 所有合約統一的 startBlock
```
startBlock: 53308155
```

## 🚀 使用方式

### 1. 基本用法
```typescript
import { getHeroContractAddress, createEntityId } from "./config"

// 獲取 Hero 合約地址
let heroAddress = getHeroContractAddress()

// 創建實體 ID
let heroId = createEntityId(heroAddress, tokenId.toString())
```

### 2. 在 Party 映射中使用
```typescript
// 動態獲取合約地址
let heroContractAddress = getHeroContractAddress()
let relicContractAddress = getRelicContractAddress()

// 批量處理關聯
for (let i = 0; i < event.params.heroIds.length; i++) {
    let heroId = createEntityId(heroContractAddress, event.params.heroIds[i].toString())
    // ... 處理邏輯
}
```

### 3. 支持多網路部署
```typescript
// 添加新網路配置
const ETHEREUM_ADDRESSES: ContractAddresses = {
    hero: "0x...",
    relic: "0x...",
    // ... 其他合約地址
}

// 在 getAddressesForNetwork() 中添加
if (network == "bsc") {
    return BSC_ADDRESSES
} else if (network == "mainnet") {
    return ETHEREUM_ADDRESSES
} else {
    return BSC_ADDRESSES // 默認
}
```

## 🔄 The Graph 中的"環境變數"替代方案

### 原始問題理解
您問是否可以像環境變數那樣動態獲取合約地址，確實在 The Graph 中沒有傳統的 ENV 環境變數。

### 解決方案
我們提供了以下替代方案：

1. **網路感知配置**
   - 使用 `dataSource.network()` 檢測當前網路
   - 根據網路返回不同的配置

2. **合約地址動態獲取**
   - 使用 `dataSource.address()` 獲取當前合約地址
   - 透過配置映射獲取相關合約地址

3. **統一配置管理**
   - 所有地址集中在一個文件中
   - 易於維護和更新

## ✅ 測試結果

### 編譯狀態
```bash
npm run codegen  # ✅ 成功
npm run build    # ✅ 成功
```

### 文件狀態
- ✅ `networks.json` - 包含所有 8 個合約地址
- ✅ `subgraph.yaml` - 地址與 networks.json 一致
- ✅ `src/config.ts` - 新的配置系統
- ✅ `src/party.ts` - 移除硬編碼，使用配置系統
- ✅ `src/hero.ts` - 使用統一的實體 ID 創建

## 🎯 最佳實踐建議

### 1. 統一地址管理
- 所有合約地址統一放在 `src/config.ts`
- 使用對應的 getter 函數獲取地址
- 避免在多個文件中重複定義

### 2. 實體 ID 標準化
- 使用 `createEntityId()` 統一創建實體 ID
- 格式：`contractAddress.toLowerCase()-tokenId`
- 確保全局唯一性

### 3. 網路配置
- 支持多網路部署
- 使用 `dataSource.network()` 自動檢測
- 提供默認配置作為後備

### 4. 錯誤處理
- 使用 `isValidAddress()` 驗證地址
- 記錄相關的調試信息
- 提供有意義的錯誤消息

## 🚀 下一步
1. 現在可以安全地重新部署子圖
2. 監控索引狀態和性能
3. 如需添加新網路，只需更新 `config.ts`
4. 考慮為其他文件也應用配置系統

---

**配置改進完成時間：** 2025-01-09  
**狀態：** ✅ 完成  
**編譯狀態：** ✅ 成功  
**可部署狀態：** ✅ 就緒