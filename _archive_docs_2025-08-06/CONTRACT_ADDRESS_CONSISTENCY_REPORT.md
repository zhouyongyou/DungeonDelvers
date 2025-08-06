# 合約地址一致性檢查報告

生成時間：2025-07-28

## 檢查結果摘要

**發現嚴重不一致問題**：後端系統 (.env) 使用的合約地址與其他三個系統完全不同。

## 詳細比對結果

### 1. NFT 合約

| 合約 | 前端 (V25) | 智能合約 (V25) | 子圖 (V25) | 後端 config.js (V25) | 後端 .env (V15) |
|------|------------|----------------|------------|---------------------|-----------------|
| HERO | 0x162b0b673f38C11732b0bc0B4B026304e563e8e2 | ✅ 一致 | ✅ 一致 | ✅ 一致 | ❌ 0x2b6CB00D10EFB1aF0125a26dfcbd9EBa87e07CD2 |
| RELIC | 0x15c2454A31Abc0063ef4a71d0640057d71847a22 | ✅ 一致 | ✅ 一致 | ✅ 一致 | ❌ 0xaEa78C3FC4bc50966aC41D76331fD0bf219D00ac |
| PARTY | 0xab07E90d44c34FB62313C74F3C7b4b343E52a253 | ✅ 一致 | ✅ 一致 | ✅ 一致 | ❌ 0x514AFBb114fa6c77CC025720A31aaeE038fBbcd7 |

### 2. 核心合約

| 合約 | 前端 (V25) | 智能合約 (V25) | 子圖 (V25) | 後端 config.js (V25) | 後端 .env (V15) |
|------|------------|----------------|------------|---------------------|-----------------|
| DUNGEONCORE | 0x04b33eEB6Da358ea9Dd002a1E1c28AC90A25881E | ✅ 一致 | N/A | ✅ 一致 | ❌ 0xA43edd46Eb4416195bc1BAA3575358EA92CE49dD |
| DUNGEONMASTER | 0x08Bd8E0D85A7F10bEecCBA9a67da9033f9a7C8D9 | ✅ 一致 | ✅ 一致 | ✅ 一致 | ❌ 0xaeBd33846a4a88Afd1B1c3ACB5D8C5872796E316 |
| ORACLE | 0x2350D85e5DF1b6a6d055CD61FeD27d5dC36B6F52 | ✅ 一致 | N/A | ✅ 一致 | ❌ 0x623caa925445BeACd54Cc6C62Bb725B5d93698af |

### 3. 輔助合約

| 合約 | 前端 (V25) | 智能合約 (V25) | 子圖 (V25) | 後端 config.js (V25) | 後端 .env (V15) |
|------|------------|----------------|------------|---------------------|-----------------|
| PLAYERPROFILE | 0x145F19e672a7D53ddb16bcE3fdeAd976bb3ef82f | ✅ 一致 | ✅ 一致 | ✅ 一致 | ❌ 0x5d4582266654CBEA6cC6Bdf696B68B8473521b63 |
| VIPSTAKING | 0xdC285539069Fa51b9259bd1F1d66f23f74B96A6c | ✅ 一致 | ✅ 一致 | ✅ 一致 | ❌ 0x9c2fdD1c692116aB5209983e467286844B3b9921 |
| PLAYERVAULT | 0x4d06483c907DB1CfA9C2207D9DC5a1Abad86544b | ✅ 一致 | N/A | ✅ 一致 | ❌ 0x34d94193aa59f8a7E34040Ed4F0Ea5B231811388 |
| DUNGEONSTORAGE | 0x4b1A9a45d0a1C35CDbae04272814f3daA9b59c47 | ✅ 一致 | N/A | ✅ 一致 | ❌ 0xAfA453cdca0245c858DAeb4d3e21C6360F4d62Eb |
| ALTAROFASCENSION | 0x0148Aff0Dee6D31BA9825e66ED34a66BCeF45845 | ✅ 一致 | ✅ 一致 | ✅ 一致 | ❌ 0x0000000000000000000000000000000000000000 |

### 4. 代幣合約

| 合約 | 前端 (V25) | 智能合約 (V25) | 子圖 (V25) | 後端 config.js (V25) | 後端 .env (V15) |
|------|------------|----------------|------------|---------------------|-----------------|
| SOULSHARD | 0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF | ✅ 一致 | N/A | ✅ 一致 | ✅ 一致 |

## 問題總結

1. **後端 .env 文件嚴重過時**：使用 V15 版本地址，與其他系統的 V25 版本不兼容
2. **後端配置不一致**：config/contracts.js 已更新為 V25，但 .env 仍為 V15
3. **AltarOfAscension 在 .env 中為零地址**：表示 V15 版本可能未部署此合約

## 建議行動

### 立即行動（緊急）
1. **更新後端 .env 文件**：將所有合約地址更新為 V25 版本
2. **重啟後端服務**：確保新地址生效
3. **測試所有功能**：驗證更新後的功能正常

### 短期改進
1. **統一配置來源**：移除 .env 中的合約地址，統一使用 config/contracts.js
2. **添加版本檢查**：在啟動時驗證配置版本一致性
3. **文檔更新**：記錄配置更新流程

### 長期優化
1. **建立自動同步機制**：使用 v25-sync-all.js 類似的工具
2. **配置版本管理**：為每個部署版本創建獨立配置
3. **監控告警**：實時監控配置不一致問題

## 附錄：正確的 V25 地址配置

```env
# Contract Addresses (V25)
TESTUSD_ADDRESS=0xa095B8c9D9964F62A7dbA3f60AA91dB381A3e074
SOULSHARD_ADDRESS=0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF
HERO_ADDRESS=0x162b0b673f38C11732b0bc0B4B026304e563e8e2
RELIC_ADDRESS=0x15c2454A31Abc0063ef4a71d0640057d71847a22
PARTY_ADDRESS=0xab07E90d44c34FB62313C74F3C7b4b343E52a253
DUNGEONCORE_ADDRESS=0x04b33eEB6Da358ea9Dd002a1E1c28AC90A25881E
DUNGEONMASTER_ADDRESS=0x08Bd8E0D85A7F10bEecCBA9a67da9033f9a7C8D9
DUNGEONSTORAGE_ADDRESS=0x4b1A9a45d0a1C35CDbae04272814f3daA9b59c47
PLAYERVAULT_ADDRESS=0x4d06483c907DB1CfA9C2207D9DC5a1Abad86544b
PLAYERPROFILE_ADDRESS=0x145F19e672a7D53ddb16bcE3fdeAd976bb3ef82f
VIPSTAKING_ADDRESS=0xdC285539069Fa51b9259bd1F1d66f23f74B96A6c
ORACLE_ADDRESS=0x2350D85e5DF1b6a6d055CD61FeD27d5dC36B6F52
ALTAROFASCENSION_ADDRESS=0x0148Aff0Dee6D31BA9825e66ED34a66BCeF45845
DUNGEONMASTERWALLET_ADDRESS=0x10925A7138649C7E1794CE646182eeb5BF8ba647

# Version Info
VERSION=V25
DEPLOYMENT_DATE=2025-07-28
```