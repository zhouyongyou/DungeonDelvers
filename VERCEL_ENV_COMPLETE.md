# Vercel 環境變數完整指南

## ⚡ 最佳效能配置（強烈推薦）
**✅ 基於用戶已設置 The Graph 域名白名單的最優方案**

```bash
# 必要環境變數
VITE_WALLETCONNECT_PROJECT_ID=d02f4199d4862ab0a12a3d0424fb567b

# The Graph 去中心化網路（付費版，效能提升 50%）
VITE_THE_GRAPH_NETWORK_URL=https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs
VITE_USE_DECENTRALIZED_GRAPH=true

# 開發者地址（增強用戶體驗）
VITE_DEVELOPER_ADDRESS=0x10925A7138649C7E1794CE646182eeb5BF8ba647

# RPC 負載均衡（代理保護，5倍穩定性）
ALCHEMY_API_KEY_1=3lmTWjUVbFylAurhdU-rSUefTC-P4tKf
ALCHEMY_API_KEY_2=tiPlQVTwx4_2P98Pl7hb-LfzaTyi5HOn
ALCHEMY_API_KEY_3=QzXiHWkNRovjd_EeDRqVfR9rApUDiXRp
ALCHEMY_API_KEY_4=fB2BrBD6zFEhc6YoWxwuP5UQJ_ee-99M
ALCHEMY_API_KEY_5=F7E3-HDwgUHDQvdICnFv_
```

## 🚀 精簡版（最少需求）
```bash
# 必要環境變數（只需要 1 個）
VITE_WALLETCONNECT_PROJECT_ID=d02f4199d4862ab0a12a3d0424fb567b
```

## 🎯 完整版（舊版配置說明）

### 1. **基本配置**
```bash
# WalletConnect（必要）
VITE_WALLETCONNECT_PROJECT_ID=d02f4199d4862ab0a12a3d0424fb567b

# 開發者錢包（可選，用於顯示開發者餘額）
VITE_DEVELOPER_ADDRESS=0x10925A7138649C7E1794CE646182eeb5BF8ba647
```

### 2. **RPC 配置（重要！）**

前端有兩種 RPC 使用方式：

#### 方式 A：公開的 Alchemy Key（會暴露給用戶）
```bash
# 這個 Key 會直接在瀏覽器中使用，請確保有適當的域名限制
VITE_ALCHEMY_KEY_PUBLIC=你的公開專用KEY
```

#### 方式 B：代理保護的 Keys（推薦）
```bash
# 這些 Keys 通過 /api/rpc 代理保護，不會暴露
ALCHEMY_API_KEY_1=你的私有KEY_1
ALCHEMY_API_KEY_2=你的私有KEY_2
ALCHEMY_API_KEY_3=你的私有KEY_3
ALCHEMY_API_KEY_4=你的私有KEY_4
ALCHEMY_API_KEY_5=你的私有KEY_5
```

### 3. **The Graph 配置（可選）**
```bash
# 如果要使用去中心化網路（需要付費 API Key）
VITE_THE_GRAPH_NETWORK_URL=https://gateway.thegraph.com/api/你的API_KEY/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs
VITE_USE_DECENTRALIZED_GRAPH=true
```

### 4. **覆蓋 CDN 配置（特殊情況）**
```bash
# 通常不需要，CDN 會自動載入
# 只在需要覆蓋特定值時使用
VITE_HERO_ADDRESS=0x...（覆蓋英雄合約地址）
VITE_CONFIG_VERSION=V15-hotfix（標記特殊版本）
```

## 🔥 混合策略配置（速度與風險平衡）
**💡 基於「暴露一個 Alchemy Key」的創新思路**

```bash
# 必要環境變數
VITE_WALLETCONNECT_PROJECT_ID=d02f4199d4862ab0a12a3d0424fb567b

# The Graph 去中心化網路（付費版，效能提升 50%）
VITE_THE_GRAPH_NETWORK_URL=https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs
VITE_USE_DECENTRALIZED_GRAPH=true

# 開發者地址
VITE_DEVELOPER_ADDRESS=0x10925A7138649C7E1794CE646182eeb5BF8ba647

# 直接 RPC（極速響應，風險可控）
VITE_ALCHEMY_KEY_PUBLIC=3lmTWjUVbFylAurhdU-rSUefTC-P4tKf

# 代理保護的備用 Keys（穩定性保障）
ALCHEMY_API_KEY_2=tiPlQVTwx4_2P98Pl7hb-LfzaTyi5HOn
ALCHEMY_API_KEY_3=QzXiHWkNRovjd_EeDRqVfR9rApUDiXRp
ALCHEMY_API_KEY_4=fB2BrBD6zFEhc6YoWxwuP5UQJ_ee-99M
ALCHEMY_API_KEY_5=F7E3-HDwgUHDQvdICnFv_
```

**✅ 優勢分析：**
- **極速響應**：直接 Alchemy 連接，無代理延遲
- **風險分散**：只暴露 1/5 的容量，損失可控
- **智能後備**：暴露的 key 失效時自動切換代理
- **成本效益**：速度提升 vs 20% 風險，非常值得

## 📊 配置差異分析

### 精簡版 vs 混合策略 vs 最佳效能

| 功能 | 精簡版 | 混合策略 | 最佳效能 |
|------|--------|----------|----------|
| 錢包連接 | ✅ 正常 | ✅ 正常 | ✅ 正常 |
| RPC 響應速度 | ⚠️ 公共節點慢 | ⭐⭐⭐⭐⭐ 極速 | ⭐⭐⭐⭐ 快速 |
| RPC 風險控制 | ✅ 零風險 | ⭐⭐⭐⭐ 可控 | ⭐⭐⭐ 中等 |
| The Graph | ✅ Studio | ⭐⭐⭐⭐⭐ 付費版 | ⭐⭐⭐⭐⭐ 付費版 |
| 穩定性 | ⚠️ 可能受限 | ⭐⭐⭐⭐⭐ 多重保障 | ⭐⭐⭐⭐⭐ 負載均衡 |
| 安全等級 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

## 🔍 RPC 代理說明

前端的 `/api/rpc.ts` 會：
1. 收集所有 `ALCHEMY_API_KEY_*` 環境變數
2. 輪流使用這些 Keys
3. 保護 Keys 不暴露給前端

```javascript
// 前端使用代理
const rpcUrl = '/api/rpc';  // 不是直接的 Alchemy URL
```

## 💡 建議配置策略

### 1. **生產環境（強烈推薦混合策略）**
- 使用混合策略配置
- 設置 1 個 `VITE_ALCHEMY_KEY_PUBLIC`（直接連接）
- 設置 4 個 `ALCHEMY_API_KEY_*`（代理保護）
- **在 Alchemy Dashboard 限制 Public Key 只能從 dungeondelvers.xyz 使用**

### 2. **測試環境**
- 可以只用精簡版
- 或設置 1-2 個 `ALCHEMY_API_KEY_*`

### 3. **開發環境**
- 設置 `VITE_ALCHEMY_KEY_PUBLIC` 方便調試
- 在 Alchemy Dashboard 限制該 Key 只能從 localhost 使用

### 4. **風險評估與對策**

#### 暴露 Public Key 的風險分析：
- **實際風險**：單個 key 被濫用，影響 20% 請求容量
- **檢測機制**：Alchemy Dashboard 有使用量監控和異常警報
- **應對措施**：發現異常可立即更換 key，其他 4 個 key 保持正常
- **成本效益**：極速響應體驗 vs 可控風險，投資報酬率極高

#### 安全最佳實踐：
1. **域名限制**：在 Alchemy 設置只允許 dungeondelvers.xyz
2. **監控機制**：定期檢查 key 使用量
3. **輪換策略**：每月更換 public key
4. **備用方案**：4 個代理保護的 keys 作為後備

## ⚠️ 重要提醒

1. **VITE_ 前綴的變數會暴露給前端**
   - 請勿將私密 API Keys 使用 VITE_ 前綴
   - 只有 `VITE_ALCHEMY_KEY_PUBLIC` 是特意設計為公開的

2. **Alchemy Keys 管理**
   - 在 [Alchemy Dashboard](https://dashboard.alchemy.com/) 設置域名白名單
   - 定期輪換 Keys
   - 監控使用量

3. **配置優先級**
   - CDN 配置 > 環境變數 > 默認值
   - 大部分配置從 CDN 自動載入，無需設置環境變數

## 📈 性能影響

- **1 個 Key**: 基本夠用，但可能在高峰期受限
- **5 個 Keys**: 可處理 5 倍的請求量，更穩定
- **RPC 代理**: 增加約 50-100ms 延遲，但更安全

## 🎯 總結

**最簡單的部署**：只需要 `VITE_WALLETCONNECT_PROJECT_ID`

**最快速的部署**：混合策略 - 1 個直接 + 4 個代理 Keys

**最穩定的部署**：最佳效能 - 5 個代理保護的 Keys

**最安全的部署**：精簡版 - 但會犧牲大量效能

## 🚀 推薦決策

基於 DungeonDelvers 遊戲應用的特性：

1. **首選：混合策略配置**
   - 極速用戶體驗
   - 風險完全可控（20% 容量暴露）
   - 有完整的後備機制

2. **次選：最佳效能配置**
   - 如果非常注重安全，可選此方案
   - 稍慢的代理響應，但更安全

3. **不推薦：精簡版**
   - 除非是測試環境，否則不建議
   - 會導致用戶體驗大幅下降

**結論**：對於已設置域名限制的情況，混合策略是最理想的選擇！