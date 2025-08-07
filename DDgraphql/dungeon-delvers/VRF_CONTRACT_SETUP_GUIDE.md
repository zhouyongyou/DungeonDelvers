# VRF 合約設置指南

## 📋 概述
本指南說明如何正確設置和授權 VRF Manager 與 NFT 合約之間的連接。

## 🎯 V25 合約地址

### 核心合約
- **VRF Manager**: `0xE1D1c53e2e467BFF3d6e4EffB7b89C0C10711ad1`
- **Hero NFT**: `0x5eded2670a6e7eb4a9c581bc397edc3b48cafd6d`
- **Relic NFT**: `0x7a9469587ffd28a69d4420d8893e7a0e92ef6316`
- **Altar of Ascension**: `0x3de7c97e6b65be8a1d726f5261cda1dd7d1e0cf1`

## ⚙️ 設置步驟

### 1. 檢查 VRF Manager 擁有者
```bash
# 運行檢查腳本
npx hardhat run scripts/check-vrf-auth.js --network bsc
```

### 2. 授權 NFT 合約
VRF Manager 必須授權 Hero 和 Relic 合約才能使用 VRF 服務。

```javascript
// 授權腳本 (scripts/check-vrf-auth.js)
const vrfManager = await ethers.getContractAt(vrfManagerAbi, vrfManagerAddress);

// 授權 Hero 合約
await vrfManager.setAuthorizedContract(heroAddress, true);

// 授權 Relic 合約
await vrfManager.setAuthorizedContract(relicAddress, true);
```

### 3. 驗證授權狀態
```bash
# 查詢授權事件
npx hardhat run scripts/check-vrf-events.js --network bsc
```

## 🔍 常見問題

### "Not authorized #1002" 錯誤
**原因**: VRF Manager 未授權 NFT 合約
**解決方案**: 
1. 確認你是 VRF Manager 的 owner
2. 運行授權腳本 `scripts/check-vrf-auth.js`
3. 等待交易確認

### "execution reverted" 錯誤
**原因**: 嘗試讀取未實現的函數
**解決方案**: 使用正確的函數名稱 `setAuthorizedContract` 而非 `setAuthorization`

## 📝 授權狀態確認

### 成功授權的交易
- Hero 授權 TX: `0x344821daffef2ef18a92b5486b6834209f224f444d08db486fae3eb82fd7c586`
- Relic 授權 TX: `0x615e063c34021b8c46028482c2cee694ab887db34bb981e7364c2579467e8cc2`

### 檢查授權狀態的方法
1. 查詢鏈上事件 `AuthorizationUpdated`
2. 嘗試執行 mint 交易
3. 使用 BSCScan 查看合約狀態

## 🚀 測試鑄造

授權完成後，可以測試 NFT 鑄造：

```javascript
// 測試 Hero 鑄造
const hero = await ethers.getContractAt('Hero', heroAddress);
await hero.mintFromWallet(1, { value: platformFee });

// 測試 Relic 鑄造
const relic = await ethers.getContractAt('Relic', relicAddress);
await relic.mintFromWallet(1, { value: platformFee });
```

## 📊 VRF 配置參數

### 當前設置
- **VRF 請求價格**: 0.0001 BNB
- **平台費用**: 0.0003 BNB per NFT
- **回調 Gas 限制**: 預設值
- **確認數**: 預設值

### 調整參數（需要 owner 權限）
```javascript
// 設置 VRF 請求價格
await vrfManager.setVrfRequestPrice(ethers.parseEther("0.0001"));

// 設置平台費用
await vrfManager.setPlatformFee(ethers.parseEther("0.0003"));

// 設置回調 Gas 限制
await vrfManager.setCallbackGasLimit(200000);
```

## 🔗 相關文檔
- [合約部署記錄](./DEPLOYMENT_RECORD_2025-08-02.md)
- [合約優化記錄](./OPTIMIZATION_RECORD_2025-08-02.md)
- [主配置文件](./master-config.json)

## 📅 更新歷史
- 2025-08-06: 成功授權 V25 Hero 和 Relic 合約
- 2025-08-02: 部署 V25 合約
- 2025-08-02: 優化合約大小至 24KB 以下

---

*最後更新: 2025-08-06*