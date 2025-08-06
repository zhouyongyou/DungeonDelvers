# PlayerVault v4.0 升級指南

## 📋 概述

PlayerVault 合約從 v3.2 升級到 v4.0，核心變更是從實際轉帳改為虛擬記帳系統，大幅降低 gas 費用並提升用戶體驗。

**升級日期**: 2025-07-31  
**合約版本**: PlayerVault v4.0 (簡化虛擬記帳版本)  
**影響範圍**: 合約、子圖、前端  

---

## 🔄 核心變更

### 1. 虛擬記帳系統

#### **舊版 (v3.2) 行為**
```solidity
// 實際轉帳給推薦人
soulShardToken.safeTransfer(referrer, commissionAmount);
// 實際轉帳稅收給 Owner
soulShardToken.safeTransfer(dungeonCore.owner(), taxAmount);
// 遊戲消費實際轉帳
soulShardToken.safeTransfer(msg.sender, _amount);
```

#### **新版 (v4.0) 行為**
```solidity
// 虛擬記帳佣金
virtualCommissionBalance[referrer] += commissionAmount;
// 虛擬記帳稅收
virtualTaxBalance += taxAmount;
// 遊戲消費純虛擬扣款（不轉帳）
player.withdrawableBalance -= _amount;
```

### 2. 新增狀態變數

```solidity
mapping(address => uint256) public virtualCommissionBalance; // 推薦人虛擬佣金餘額
uint256 public virtualTaxBalance; // 虛擬稅收餘額
```

### 3. 新增事件

```solidity
event VirtualGameSpending(address indexed player, address indexed spender, uint256 amount);
event VirtualCommissionAdded(address indexed referrer, uint256 amount);
event VirtualTaxCollected(uint256 amount);
```

### 4. 新增功能函數

```solidity
function withdrawCommission() external; // 推薦人提取佣金
function withdrawTax() external onlyOwner; // Owner 提取稅收
function getCommissionBalance(address _user) external view returns (uint256);
function getTaxBalance() external view returns (uint256);
function emergencyWithdrawSoulShard(uint256 _amount) external onlyOwner;
```

---

## 📊 子圖更新狀態

### ✅ 已完成支援

**文件**: `DDgraphql/dungeon-delvers/src/player-vault.ts`

```typescript
// 新增事件處理器
export function handleVirtualGameSpending(event: VirtualGameSpending): void {
    const vault = getOrCreatePlayerVault(event.params.player)
    vault.totalVirtualGameSpending = vault.totalVirtualGameSpending.plus(event.params.amount)
    vault.save()
}

export function handleVirtualCommissionAdded(event: VirtualCommissionAdded): void {
    const vault = getOrCreatePlayerVault(event.params.referrer)
    vault.totalVirtualCommissionEarned = vault.totalVirtualCommissionEarned.plus(event.params.amount)
    vault.save()
}
```

### Schema 支援

現有 `PlayerVault` 實體已包含所有必要欄位：

```graphql
type PlayerVault {
  pendingRewards: BigInt!              # 支援虛擬餘額
  totalVirtualGameSpending: BigInt!    # 虛擬遊戲消費追蹤
  totalVirtualCommissionEarned: BigInt! # 虛擬佣金追蹤
}
```

---

## 🎨 前端更新狀態

### ✅ 已完成支援

#### 1. 新 Hook: `usePlayerVaultV4.ts`

```typescript
export const usePlayerVaultV4 = () => {
  // 查詢可提現餘額
  const { data: playerInfo } = useReadContract({
    functionName: 'playerInfo',
    args: [address]
  });

  // 查詢佣金餘額 (新功能)
  const { data: commissionBalance } = useReadContract({
    functionName: 'getCommissionBalance',
    args: [address]
  });

  // 查詢累計佣金
  const { data: totalCommissionPaid } = useReadContract({
    functionName: 'getTotalCommissionPaid',
    args: [address]
  });

  return {
    withdrawableBalance: parsedPlayerInfo?.withdrawableBalance || 0n,
    commissionBalance: commissionBalance || 0n,
    totalCommissionPaid: totalCommissionPaid || 0n,
    // ... 其他功能
  };
};
```

#### 2. 新組件: `CommissionManager.tsx`

**位置**: `src/components/referral/CommissionManager.tsx`

**功能**:
- 顯示可提取佣金餘額
- 顯示累計總佣金
- 提供佣金提取功能
- 佣金說明和詳細信息

**使用方式**:
```typescript
import { CommissionManager } from '../components/referral/CommissionManager';

// 在推薦頁面中使用
<CommissionManager className="mb-6" />
```

#### 3. 合約 ABI 更新

**文件**: `src/abis/PlayerVault.json`  
已包含所有新功能函數的 ABI 定義。

---

## 🚀 新功能使用指南

### 對推薦人 (Referrer)

#### 查詢佣金餘額
```typescript
const { commissionBalance, totalCommissionPaid } = usePlayerVaultV4();

console.log('可提取佣金:', formatEther(commissionBalance), 'SOUL');
console.log('累計總佣金:', formatEther(totalCommissionPaid), 'SOUL');
```

#### 提取佣金
```typescript
const { executeTransaction } = useContractTransaction();
const { playerVaultContract } = usePlayerVaultV4();

await executeTransaction({
  contractCall: {
    address: playerVaultContract.address,
    abi: playerVaultContract.abi,
    functionName: 'withdrawCommission'
  },
  description: '提取推薦佣金',
  successMessage: '佣金提取成功！'
});
```

### 對管理員 (Owner)

#### 查詢稅收餘額
```typescript
const { data: taxBalance } = useReadContract({
  address: playerVaultContract.address,
  abi: playerVaultContract.abi,
  functionName: 'getTaxBalance'
});
```

#### 提取稅收
```typescript
await executeTransaction({
  contractCall: {
    address: playerVaultContract.address,
    abi: playerVaultContract.abi,
    functionName: 'withdrawTax'
  },
  description: '提取累積稅收'
});
```

---

## 📍 現有頁面整合

### 1. 推薦頁面 (`/referral`)

**已整合功能**:
- `<CommissionManager />` 組件自動顯示佣金相關功能
- 推薦人可以看到並提取佣金

### 2. 總覽頁面 (`/dashboard`)

**建議增強**:
```typescript
// 在總覽頁面顯示佣金資訊
const { commissionBalance } = usePlayerVaultV4();

// 在金庫餘額區域旁邊添加佣金卡片
{commissionBalance > 0n && (
  <div className="bg-green-800/20 p-4 rounded-lg">
    <h3>待提取佣金</h3>
    <p>{formatEther(commissionBalance)} SOUL</p>
    <Link to="/referral">管理佣金 →</Link>
  </div>
)}
```

### 3. 管理頁面 (`/admin`)

**建議新增功能**:
```typescript
// 稅收管理區塊
const TaxManagement = () => {
  const { data: taxBalance } = useReadContract({
    functionName: 'getTaxBalance'
  });

  return (
    <div className="admin-section">
      <h3>稅收管理</h3>
      <p>累積稅收: {formatEther(taxBalance || 0n)} SOUL</p>
      <ActionButton onClick={handleWithdrawTax}>
        提取稅收
      </ActionButton>
    </div>
  );
};
```

---

## ⚠️ 重要注意事項

### 1. 向後相容性

- ✅ 所有現有提款功能完全相容
- ✅ 用戶體驗無變化
- ✅ 現有數據不受影響

### 2. Gas 費用影響

- 🔽 **大幅降低**: 遊戲內消費不再需要實際轉帳
- 🔽 **佣金效率**: 佣金累積後統一提取，減少小額轉帳
- 🔽 **稅收優化**: 稅收批量提取，提升效率

### 3. 用戶體驗提升

- ✨ **推薦人**: 獲得專用的佣金管理界面
- ✨ **即時反饋**: 虛擬扣款立即生效
- ✨ **透明度**: 所有虛擬記帳都有對應事件

### 4. 開發建議

#### 測試重點
```typescript
// 1. 測試佣金提取
const commissionBalance = await playerVault.getCommissionBalance(referrer);
await playerVault.connect(referrer).withdrawCommission();

// 2. 測試稅收提取
const taxBalance = await playerVault.getTaxBalance();
await playerVault.connect(owner).withdrawTax();

// 3. 測試虛擬遊戲消費
await playerVault.connect(gameContract).spendForGame(player, amount);
```

#### 監控要點
- 監控 `VirtualGameSpending` 事件
- 監控 `VirtualCommissionAdded` 事件
- 監控 `VirtualTaxCollected` 事件
- 定期檢查虛擬餘額與實際餘額的一致性

---

## 🔗 相關文件

- **合約源碼**: `/contracts/current/defi/PlayerVault.sol`
- **子圖映射**: `/DDgraphql/dungeon-delvers/src/player-vault.ts`
- **前端 Hook**: `/src/hooks/usePlayerVaultV4.ts`
- **佣金組件**: `/src/components/referral/CommissionManager.tsx`
- **合約 ABI**: `/src/abis/PlayerVault.json`

---

## 📝 更新檢查清單

### 合約部署後

- [ ] 驗證新合約地址已更新到配置文件
- [ ] 確認子圖已重新部署並同步新事件
- [ ] 測試佣金提取功能
- [ ] 測試稅收提取功能  
- [ ] 驗證虛擬記帳事件正確觸發
- [ ] 檢查前端界面顯示正確

### 用戶溝通

- [ ] 更新用戶文檔說明新的佣金功能
- [ ] 通知推薦人可以提取累積佣金
- [ ] 說明虛擬記帳系統的優勢（更低 gas 費用）

---

*此文檔將隨著功能發展持續更新。最後更新日期: 2025-07-31*