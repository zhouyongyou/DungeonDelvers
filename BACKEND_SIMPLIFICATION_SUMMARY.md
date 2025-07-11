# 後端伺服器簡化總結

## 修改概述

為了配合前端的簡化，我們對後端伺服器進行了相應的修改，將動態SVG生成改為靜態圖片路徑。

## 已完成的修改

### 1. Metadata Server 修改 (`dungeon-delvers-metadata-server/src/index.js`)

#### Hero Metadata
- **修改前**：返回動態SVG base64編碼
- **修改後**：返回靜態圖片路徑 `https://dungeondelvers.xyz/images/hero/hero-{1-5}.png`
- **邏輯**：根據 `tokenId % 5 + 1` 選擇對應的圖片

#### Relic Metadata
- **修改前**：返回動態SVG base64編碼
- **修改後**：返回靜態圖片路徑 `https://dungeondelvers.xyz/images/relic/relic-{1-5}.png`
- **邏輯**：根據 `tokenId % 5 + 1` 選擇對應的圖片

#### Party Metadata
- **修改前**：返回動態SVG base64編碼
- **修改後**：返回靜態圖片路徑 `https://dungeondelvers.xyz/images/party/party.png`
- **邏輯**：所有隊伍使用同一張圖片

#### VIP Metadata
- **修改前**：返回動態SVG base64編碼
- **修改後**：返回靜態圖片路徑 `https://dungeondelvers.xyz/images/vip-placeholder.png`
- **邏輯**：所有VIP卡使用同一張圖片

#### Player Profile Metadata
- **保持不變**：維持動態SVG生成
- **原因**：個人檔案需要根據玩家等級和經驗值動態生成

### 2. 變數名稱修復
- 修復了 GraphQL ID 變數名稱衝突問題
- 將 `heroId`、`relicId`、`partyId` 重命名為 `graphqlId` 以避免與圖片ID變數衝突

### 3. 部署腳本
- 創建了 `deploy_metadata_server.sh` 腳本
- 自動化部署流程，包括依賴安裝、容器構建、健康檢查和API測試

## 子圖狀態

### 不需要修改的部分
- **子圖 Schema**：已經正確使用 `heros` 而非 `heroes`
- **子圖源代碼**：沒有發現需要修改的 pluralization 問題
- **子圖部署**：不需要重新部署，因為沒有修改 schema 或邏輯

### 檢查結果
- ✅ GraphQL 查詢使用正確的字段名稱
- ✅ 實體關係定義正確
- ✅ 沒有發現 `heroes` 字段的使用

## 部署步驟

### 1. 本地部署
```bash
# 在專案根目錄執行
./deploy_metadata_server.sh
```

### 2. 生產環境部署
```bash
cd dungeon-delvers-metadata-server
docker-compose -f docker-compose.production.yml up -d --build
```

## 測試建議

### 1. API 端點測試
```bash
# 健康檢查
curl http://localhost:3001/health

# Hero API
curl http://localhost:3001/api/hero/1

# Relic API
curl http://localhost:3001/api/relic/1

# Party API
curl http://localhost:3001/api/party/1

# VIP API
curl http://localhost:3001/api/vipstaking/1
```

### 2. 圖片路徑驗證
檢查返回的 metadata 中的 `image` 字段是否指向正確的靜態圖片路徑。

### 3. 前端整合測試
- 確認 NFT 市場顯示不同的英雄和聖物圖片
- 確認隊伍和VIP顯示正確的圖片
- 確認個人檔案仍然顯示動態SVG

## 優勢

### 1. 性能提升
- 減少 SVG 生成計算
- 減少 base64 編碼/解碼
- 更快的 API 響應時間

### 2. 簡化維護
- 移除複雜的 SVG 生成邏輯
- 減少錯誤處理複雜度
- 更容易調試和維護

### 3. 一致性
- 前端和後端使用相同的圖片路徑
- 統一的圖片選擇邏輯
- 減少不一致的風險

## 注意事項

### 1. 圖片路徑
- 確保 `https://dungeondelvers.xyz/images/` 路徑可訪問
- 圖片文件需要部署到正確的位置

### 2. 個人檔案
- 個人檔案仍然使用動態SVG，因為需要根據玩家數據生成
- 這是唯一需要保持動態生成的NFT類型

### 3. 向後兼容
- 修改後的API仍然返回相同的JSON結構
- 只有 `image` 字段從 base64 改為 URL

## 恢復動態SVG的方法

如果需要恢復動態SVG功能：

1. 恢復 `dungeon-delvers-metadata-server/src/index.js` 中的 SVG 生成邏輯
2. 將 `image` 字段改回 base64 編碼的SVG
3. 重新部署後端伺服器

## 最終合約地址確認

所有合約地址已更新為最終版本：

```
Oracle                   : 0x86C17E2f8940FFE6c64bf9B513656b4c51f1Ffc6
DungeonStorage           : 0x3859536f603e885525C28c0F875dAAB743C3EA1A
PlayerVault              : 0x8727c5aEd22A2cf39d183D00cC038eE600F24726
AltarOfAscension         : 0x643cB4A9EF6AE813ACeeB2a1E193b6894bdf8708
DungeonMaster            : 0xb9beF542bd333B5301846629C87363DE4FB520b7
Hero                     : 0x2Cf5429dDbd2Df730a6668b50200233c76c1116F
Relic                    : 0x548eA33d0deC74bBE9a3F0D1B5E4C660bf59E5A5
Party                    : 0x78dBA7671753191FFeeBEEed702Aab4F2816d70D
VIPStaking               : 0xf1F84F3F3632fbB9be2F3d132C3660100d2C98e2
PlayerProfile            : 0x98708fFC8afaC1289639C797f5A6F095217FAFB8
DungeonCore              : 0xbCc8C53A0F52ad1685F4356768d88FA6ac218d66
```

## 總結

這次修改成功簡化了後端伺服器，移除了複雜的動態SVG生成，改用靜態圖片路徑。這不僅提升了性能，還簡化了維護工作。子圖不需要修改，因為我們沒有改變數據結構或查詢邏輯。

### 最終配置狀態
- ✅ 前端配置使用最終合約地址
- ✅ 後端伺服器使用最終合約地址
- ✅ ENV 檔案模板已更新
- ✅ 所有地址一致性已確認 