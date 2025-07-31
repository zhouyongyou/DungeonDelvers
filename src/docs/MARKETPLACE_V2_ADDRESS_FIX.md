# Marketplace V2 NFT 合約地址修復報告

## 🚨 問題描述

Marketplace V2 系統中配置的 NFT 合約地址與主配置系統（V25）不一致，可能導致交易功能異常。

## 📊 地址對比

| NFT 類型 | Marketplace V2 原配置 | V25 主配置（正確） | 狀態 |
|---------|---------------------|------------------|------|
| HERO | `0x76C9c7E9a82132739A6E6B04FD87f16801F4EF22` | `0x785a8b7d7b2E64c5971D8f548a45B7db3CcA5797` | ❌ 不匹配 |
| RELIC | `0xe66036839c7E5F8372ADC36da8f0357429a96A34` | `0xaa7434e77343cd4AaE7dDea2f19Cb86232727D0d` | ❌ 不匹配 |
| PARTY | `0x22Ac9b248716FA64eD97025c77112c4c3e0169ab` | `0x2890F2bFe5ff4655d3096eC5521be58Eba6fAE50` | ❌ 不匹配 |

## ✅ 修復方案

### 1. 前端配置修復
- 更新 `src/config/marketplace.ts` 使用 V25 地址
- 修改 `useMarketplaceV2Contract.ts` 引用正確地址
- 確保與主配置系統一致

### 2. 智能合約層面
⚠️ **需要合約管理員操作**：
- 調用 `approveNFTContract()` 添加 V25 新地址
- 調用 `revokeNFTContract()` 移除舊地址（可選）

```solidity
// 需要在 DungeonMarketplaceV2 合約上執行
function approveNFTContract(address nftContract) external onlyOwner;
function revokeNFTContract(address nftContract) external onlyOwner;
```

## 🛡️ 風險評估

- **影響範圍**: 所有 NFT 交易功能
- **風險等級**: 🔴 高風險（功能可能完全無法使用）
- **修復複雜度**: 🟡 中等（需要合約和前端雙重修復）

## 📋 修復檢查清單

### 前端修復 ✅
- [x] 更新 marketplace.ts 配置
- [x] 修改 useMarketplaceV2Contract.ts
- [x] 確保 TypeScript 編譯通過

### 合約層面修復 ❓
- [ ] 檢查 Marketplace V2 合約當前白名單狀態
- [ ] 添加 V25 NFT 合約地址到白名單
- [ ] 測試交易功能是否正常

### 驗證測試 ❓
- [ ] 測試創建掛單功能
- [ ] 測試購買功能
- [ ] 測試出價功能
- [ ] 驗證手續費計算

## 🎯 後續行動

1. **立即**: 檢查合約白名單狀態
2. **短期**: 更新合約白名單（如需要）  
3. **中期**: 建立配置一致性檢查機制
4. **長期**: 統一所有配置管理系統

---
*修復日期: 2025-08-01*
*修復人員: Claude AI Assistant*