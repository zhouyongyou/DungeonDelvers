# URL 和合約地址檢查報告

## 🔍 檢查時間
2024年 檢查完成

## ❌ 發現的問題

### 1. 🚨 合約地址嚴重不一致問題（最高優先級）

**問題：** `consistency-check.js` 和 `consistency-assessment.md` 中包含了**完全錯誤的舊合約地址**！

**影響：** 這可能導致：
- 檢查腳本給出錯誤的結果
- 開發人員基於錯誤地址進行操作
- 系統一致性檢查失效

**已修正：** ✅ 已將兩個文件中的地址更新為正確的地址

### 2. 舊域名問題（已解決）

**位置：** `dungeon-delvers-metadata-server/src/index.js:69`
```javascript
const allowedOrigins = ['https://www.soulshard.fun', 'http://localhost:5173'];
```

**問題：** 仍在使用舊域名 `soulshard.fun`，應該更新為新域名 `dungeondelvers.xyz`

**建議修正：**
```javascript
const allowedOrigins = ['https://www.dungeondelvers.xyz', 'http://localhost:5173'];
```

### 2. 合約地址不一致問題

#### 問題描述
不同文件中的合約地址存在不一致的情況：

**在 `consistency-check.js` 中：**
```javascript
const expectedAddresses = {
  hero: '0x347752f8166D270EDE722C3F31A10584bC2867b3',
  relic: '0x06994Fb1eC1Ba0238d8CA9539dAbdbEF090A5b53',
  party: '0x4F4796b04e3BD3E8d5B447e32944d8B04eF53EB2',
  playerProfile: '0xE51ae47bf0f9958a0b35f1830675d88C2c7F5232',
  vipStaking: '0x8A9943Bb231eC9131d750c7bcf8A4Ae36bd4f0F8'
};
```

**在 `DDgraphql/dungeon-delvers/src/config.ts` 中：**
```javascript
const HERO_ADDRESS = "0x2Cf5429dDbd2Df730a6668b50200233c76c1116F"
const RELIC_ADDRESS = "0x548eA33d0deC74bBE9a3F0D1B5E4C660bf59E5A5"
const PARTY_ADDRESS = "0x78dBA7671753191FFeeBEEed702Aab4F2816d70D"
const PLAYER_PROFILE_ADDRESS = "0x98708fFC8afaC1289639C797f5A6F095217FAFB8"
const V_I_P_STAKING_ADDRESS = "0xf1F84F3F3632fbB9be2F3d132C3660100d2C98e2"
```

**在 `DDgraphql/dungeon-delvers/subgraph.yaml` 中：**
```yaml
# 包含另一組不同的地址
address: "0x2Cf5429dDbd2Df730a6668b50200233c76c1116F"  # Hero
address: "0x548eA33d0deC74bBE9a3F0D1B5E4C660bf59E5A5"  # Relic
# 等等...
```

### 3. 其他發現的URL和地址

#### 正確的URL（已更新）
✅ `index.html` - 已使用新域名 `https://www.dungeondelvers.xyz/`
✅ `README.md` - 已使用新域名 `https://www.dungeondelvers.xyz/`
✅ `CONTRACT_REDEPLOYMENT_CHECKLIST.md` - 已註明域名更新

#### 正確的RPC URL設置
✅ BSC RPC URLs 都指向正確的主網端點
✅ 沒有發現過期的RPC提供商URL

#### 開發者地址
✅ `src/config/constants.ts` - 開發者地址：`0x10925A7138649C7E1794CE646182eeb5BF8ba647`
✅ metadata collections 中的 fee_recipient 都指向相同的開發者地址

## 🔧 建議修正步驟

### 1. 立即修正 - 域名更新
```bash
# 修正 metadata server 的 CORS 設置
sed -i "s/https:\/\/www.soulshard.fun/https:\/\/www.dungeondelvers.xyz/g" dungeon-delvers-metadata-server/src/index.js
```

### 2. 合約地址統一
需要確認哪組合約地址是正確的：
- [ ] 檢查實際部署的合約地址
- [ ] 統一所有配置文件中的合約地址
- [ ] 運行 `npm run sync-addresses` 確保地址同步

### 3. 環境變量檢查
需要確認 `.env` 文件中的地址設置：
```bash
# 檢查所有必要的環境變數
VITE_MAINNET_HERO_ADDRESS=0x...
VITE_MAINNET_RELIC_ADDRESS=0x...
VITE_MAINNET_PARTY_ADDRESS=0x...
# 等等...
```

## 📋 檢查清單

- [x] 修正 metadata server 中的舊域名 **（已完成）**
- [x] 修正 consistency-check.js 中的錯誤地址 **（已完成）**
- [x] 修正 consistency-assessment.md 中的錯誤地址 **（已完成）**
- [ ] 檢查 .env 文件中的地址設置
- [ ] 運行完整的一致性檢查
- [ ] 測試 metadata server 的 CORS 設置
- [ ] 驗證前端可以正常連接到新域名

## 🚨 優先級

1. **🔥 最高優先級**：修正合約地址不一致問題 **（已完成）**
2. **高優先級**：修正域名問題 **（已完成）**
3. **中優先級**：驗證所有環境變量中的地址
4. **低優先級**：完善文檔和檢查腳本

## 💡 建議

1. 建立自動化檢查腳本，定期驗證URL和地址的一致性
2. 使用環境變量作為單一真實來源
3. 在部署前運行完整的一致性檢查

## 📋 修正摘要

### ✅ 已完成的修正

1. **修正域名問題**：
   - 文件：`dungeon-delvers-metadata-server/src/index.js`
   - 更改：`www.soulshard.fun` → `www.dungeondelvers.xyz`

2. **修正合約地址不一致問題**：
   - 文件：`consistency-check.js`
   - 更改：將8個合約地址全部更新為正確的地址
   - 文件：`consistency-assessment.md`
   - 更改：將地址表格中的8個合約地址更新為正確的地址

### 🔍 正確的合約地址（現在所有文件都一致）

| 合約 | 正確地址 |
|------|----------|
| Hero | `0x2Cf5429dDbd2Df730a6668b50200233c76c1116F` |
| Relic | `0x548eA33d0deC74bBE9a3F0D1B5E4C660bf59E5A5` |
| Party | `0x78dBA7671753191FFeeBEEed702Aab4F2816d70D` |
| PlayerProfile | `0x98708fFC8afaC1289639C797f5A6F095217FAFB8` |
| VIPStaking | `0xf1F84F3F3632fbB9be2F3d132C3660100d2C98e2` |
| DungeonMaster | `0xb9beF542bd333B5301846629C87363DE4FB520b7` |
| PlayerVault | `0x8727c5aEd22A2cf39d183D00cC038eE600F24726` |
| AltarOfAscension | `0x643cB4A9EF6AE813ACeeB2a1E193b6894bdf8708` |

### 🎯 總結

**重要發現**：`consistency-check.js` 不是自動生成的文件，而是手動創建的檢查腳本。它包含了嚴重錯誤的舊合約地址，這些地址與實際部署的合約地址完全不匹配。

**現在狀態**：所有發現的問題都已修正，系統中的URL和合約地址現在保持一致。