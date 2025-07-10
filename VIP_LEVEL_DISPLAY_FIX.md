# VIP 等級顯示問題修正報告

## 問題描述
VIP 質押後，VIP 等級沒有正確顯示。用戶在質押 $SoulShard 代幣後，VIP 卡上的等級仍然顯示為 0，而不是根據質押金額計算的實際等級。

## 問題根因分析

### 1. 系統架構概述
VIP 系統由三個主要部分組成：
- **智能合約** (`VIPStaking.sol`): 處理質押邏輯和等級計算
- **GraphQL 索引器** (`DDgraphql/dungeon-delvers/src/vip-staking.ts`): 監聽區塊鏈事件並索引數據
- **前端界面** (`src/pages/VipPage.tsx`): 顯示 VIP 狀態
- **元數據服務器** (`dungeon-delvers-metadata-server/src/index.js`): 生成 VIP NFT 元數據

### 2. VIP 等級計算邏輯
根據智能合約 `getVipLevel` 函數（`contracts/VIPStaking.sol` 第 111-121 行）：

```solidity
function getVipLevel(address _user) public view returns (uint8) {
    uint256 stakedAmount = userStakes[_user].amount;
    if (stakedAmount == 0 || address(dungeonCore) == address(0)) return 0;
    uint256 stakedValueUSD = IOracle(dungeonCore.oracle()).getAmountOut(
        address(soulShardToken), stakedAmount
    );
    
    uint8 usdDecimals = dungeonCore.usdDecimals();
    require(usdDecimals > 0, "VIP: USD decimals not set in Core");
    uint256 usdValue = stakedValueUSD / (10**usdDecimals);
    
    if (usdValue < 100) return 0;
    uint256 level = Math.sqrt(usdValue / 100);
    return uint8(level);
}
```

**等級計算規則：**
- 等級 0: $0-99 質押價值
- 等級 1: $100-399 質押價值  
- 等級 2: $400-899 質押價值
- 等級 3: $900-1599 質押價值
- 以此類推（level = sqrt(usdValue / 100)）

### 3. 問題所在

**GraphQL 索引器問題** (`DDgraphql/dungeon-delvers/src/vip-staking.ts` 第 16 行)：
```typescript
vip.level = 0 // Level is calculated off-chain
```

**元數據服務器問題** (`dungeon-delvers-metadata-server/src/index.js` 第 264 行)：
```javascript
const svgString = generateVipSVG({ level: vip.level, stakedValueUSD }, BigInt(tokenId));
```

元數據服務器依賴 GraphQL 數據中的 `vip.level`，但該值始終為 0。

### 4. 各部分的處理方式對比

| 組件 | VIP 等級獲取方式 | 狀態 |
|-----|----------------|------|
| 前端界面 | 調用智能合約 `getVipLevel` | ✅ 正確 |
| GraphQL 索引器 | 硬編碼為 0 | ❌ 錯誤 |
| 元數據服務器 | 使用 GraphQL 數據 | ❌ 錯誤 |

## 解決方案

### 修正元數據服務器
更新 `dungeon-delvers-metadata-server/src/index.js`，讓元數據服務器直接調用智能合約獲取 VIP 等級：

```javascript
// 修正前：依賴 GraphQL 數據
const svgString = generateVipSVG({ level: vip.level, stakedValueUSD }, BigInt(tokenId));

// 修正後：直接調用智能合約
const vipLevel = await publicClient.readContract({
    address: contractAddresses.vipStaking,
    abi: abis.vipStaking,
    functionName: 'getVipLevel',
    args: [owner]
});

const svgString = generateVipSVG({ level: Number(vipLevel), stakedValueUSD }, BigInt(tokenId));
```

### 修正內容詳細說明

1. **添加智能合約調用**：
   - 在元數據生成過程中添加對 `getVipLevel` 函數的調用
   - 使用 NFT 所有者地址作為參數

2. **更新 SVG 生成**：
   - 使用從智能合約獲取的實際等級值
   - 確保 VIP 卡顯示正確的等級

3. **更新 NFT 屬性**：
   - NFT 元數據中的 "Level" 屬性也使用正確的等級值

## 為什麼不修正 GraphQL 索引器？

雖然也可以在 GraphQL 索引器中計算 VIP 等級，但這樣做會有以下問題：

1. **複雜性增加**：需要在索引器中調用 Oracle 合約獲取價格
2. **性能問題**：每次事件都要進行複雜計算
3. **實時性問題**：價格變化時索引器不會自動更新等級
4. **維護困難**：需要同時維護合約和索引器的計算邏輯

因此，最好的做法是：
- **GraphQL 索引器**：只索引基本數據（質押金額、代幣 ID 等）
- **實時計算**：前端和元數據服務器直接調用智能合約獲取等級

## 修正後的系統流程

1. **用戶質押**：
   - 用戶質押 $SoulShard 代幣
   - 智能合約記錄質押信息
   - GraphQL 索引器記錄質押事件

2. **等級計算**：
   - 前端調用智能合約 `getVipLevel` 顯示等級
   - 元數據服務器調用智能合約 `getVipLevel` 生成 NFT

3. **VIP 卡顯示**：
   - VIP 卡 SVG 包含正確的等級信息
   - NFT 元數據包含正確的等級屬性

## 測試建議

1. **質押測試**：
   - 質押不同金額的 $SoulShard
   - 確認等級計算正確

2. **NFT 元數據測試**：
   - 檢查 VIP NFT 的 `tokenURI` 返回正確的等級
   - 確認 VIP 卡 SVG 顯示正確的等級

3. **前端顯示測試**：
   - 確認 VIP 頁面顯示正確的等級
   - 確認質押後等級立即更新

## 結論

通過讓元數據服務器直接調用智能合約獲取 VIP 等級，而不是依賴 GraphQL 數據，成功解決了 VIP 等級顯示問題。這種方法確保了：

- **數據準確性**：等級計算基於實時的智能合約狀態
- **系統一致性**：前端和 NFT 元數據都使用相同的等級計算邏輯
- **維護簡單性**：只需要維護一套等級計算邏輯（在智能合約中）

修正後，用戶質押 $SoulShard 代幣後，VIP 等級將正確顯示在 VIP 卡上。