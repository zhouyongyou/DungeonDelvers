# Claude Code 調試指南 - DungeonDelvers 項目

## 🎯 **項目概述**
DungeonDelvers 是一個複雜的 Web3 RPG 遊戲，包含：
- **前端**: React + Vite + TypeScript + Wagmi
- **智能合約**: 12個 Solidity 合約
- **子圖**: The Graph 索引服務
- **後端**: Metadata 服務器 (Render.com)

## 🔍 **當前主要問題**

### **1. VIP等級和稅率減免顯示問題**
- **症狀**: VIP頁面等級和稅率減免不顯示或顯示為0
- **可能原因**: 
  - 後端VIP合約地址不匹配
  - 子圖同步延遲
  - RPC調用失敗

### **2. 升星祭壇圖片顯示問題**
- **症狀**: 所有NFT顯示為一星英雄圖片
- **可能原因**:
  - 配置指向錯誤的API端點
  - 元數據image字段為空
  - 後端服務連接問題

### **3. 配置不一致問題**
- **症狀**: 多個配置文件中的地址不匹配
- **影響**: 前端無法正確連接後端服務

## 📋 **導入 Claude Code 的步驟**

### **第一步: 項目準備**
1. 確保項目在本地完整克隆
2. 確認所有依賴已安裝 (`npm install`)
3. 檢查環境變量配置

### **第二步: 重要文件識別**
優先導入以下關鍵文件：

#### **配置文件 (最高優先級)**
- `package.json` - 依賴和腳本
- `.env` 和 `.env.local` - 環境變量
- `shared-config.json` - 共享配置
- `src/config/contracts.ts` - 合約地址
- `src/config/cdn.ts` - CDN和API配置
- `vite.config.ts` - 構建配置

#### **核心前端文件**
- `src/hooks/useVipStatus.ts` - VIP狀態管理
- `src/pages/VipPage.tsx` - VIP頁面
- `src/pages/AltarPage.tsx` - 升星祭壇
- `src/api/nfts.ts` - NFT數據獲取
- `src/components/ui/NftCard.tsx` - NFT卡片組件

#### **智能合約**
- `contracts/VIPStaking.sol` - VIP質押合約
- `contracts/AltarOfAscension.sol` - 升星祭壇合約
- `contracts/interfaces.sol` - 接口定義

#### **子圖配置**
- `DDgraphql/dungeon-delvers/subgraph.yaml`
- `DDgraphql/dungeon-delvers/src/vip-staking.ts`

#### **部署腳本**
- `deploy-metadata-sync.sh` - 元數據同步腳本
- `deploy-all.sh` - 完整部署腳本

### **第三步: 系統性調試流程**

#### **1. 環境配置檢查**
```bash
# 檢查後端服務器狀態
curl https://dungeon-delvers-metadata-server.onrender.com/health

# 檢查子圖狀態  
curl -X POST https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.0.2 \
  -H "Content-Type: application/json" \
  -d '{"query":"{ _meta { block { number } } }"}'
```

#### **2. 合約地址驗證**
確認以下地址在所有配置文件中一致：
- Hero: `0x2a046140668cBb8F598ff3852B08852A8EB23b6a`
- Relic: `0x95F005e2e0d38381576DA36c5CA4619a87da550E`
- Party: `0x11FB68409222B53b04626d382d7e691e640A1DcD`
- VIP: `0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB`

#### **3. 數據流測試**
```bash
# 測試NFT元數據獲取
curl https://dungeon-delvers-metadata-server.onrender.com/api/hero/1

# 測試VIP數據
curl https://dungeon-delvers-metadata-server.onrender.com/api/vip/1
```

## 🚀 **Claude Code 調試優勢**

### **1. 全局視野**
- 同時查看所有配置文件
- 識別跨文件的不一致問題
- 理解完整的數據流

### **2. 實時測試**
- 直接運行 `npm run dev`
- 執行部署腳本
- 實時查看錯誤和修復效果

### **3. 系統性修復**
- 一次性更新所有相關配置
- 協調前端、後端、子圖的數據結構
- 避免遺漏任何依賴關係

## 🔧 **關鍵調試命令**

### **啟動開發環境**
```bash
npm run dev
```

### **測試API連接**
```bash
curl -s https://dungeon-delvers-metadata-server.onrender.com/health | jq .
```

### **檢查合約調用**
```bash
# 在瀏覽器控制台中測試VIP合約調用
# 查看Network面板中的RPC請求
```

### **清除緩存**
```bash
# 清除npm緩存
npm cache clean --force

# 清除瀏覽器緩存
# 開發者工具 -> Application -> Storage -> Clear site data
```

## 📝 **修復檢查清單**

### **配置統一性**
- [ ] 所有配置文件中的合約地址一致
- [ ] 後端API端點正確指向Render.com
- [ ] 環境變量正確設置

### **VIP功能**
- [ ] VIP合約地址匹配
- [ ] getVipLevel函數正常調用
- [ ] getVipTaxReduction函數正常調用
- [ ] 子圖VIP數據同步

### **升星祭壇**
- [ ] NFT元數據正確獲取
- [ ] 圖片URL正確生成
- [ ] 稀有度正確映射
- [ ] 選取邏輯正常工作

### **數據流**
- [ ] 合約 → 子圖同步正常
- [ ] 子圖 → 前端數據獲取正常
- [ ] 後端API響應正常
- [ ] 前端緩存策略正確

## 🎯 **預期修復結果**
1. VIP等級和稅率減免正確顯示
2. 升星祭壇NFT圖片正確加載
3. 所有配置文件統一且正確
4. 完整的數據流暢通無阻 