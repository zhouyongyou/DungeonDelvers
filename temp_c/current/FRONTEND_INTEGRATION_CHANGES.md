# 前端整合變更指南 - 安全加固版合約

此文件記錄了安全加固版合約對前端整合的影響，包括 ABI 變更、新增功能和錯誤處理。

## 📋 目錄
- [PlayerProfile_Secured 變更](#playerprofile_secured-變更)
- [DungeonStorage_Secured 變更](#dungeonstorage_secured-變更)
- [其他合約變更摘要](#其他合約變更摘要)
- [錯誤訊息對照表](#錯誤訊息對照表)

---

## PlayerProfile_Secured 變更

### 1. 結構體變更

#### ProfileData 結構體擴展
```javascript
// ❌ 原始版本 - profileData 直接返回 uint256
const experience = await contract.profileData(tokenId);

// ✅ 安全版本 - profileData 返回結構體
const profileData = await contract.profileData(tokenId);
const experience = profileData.experience;
const lastUpdate = profileData.lastExperienceUpdate;
const totalGained = profileData.totalExperienceGained;
const isLocked = profileData.isLocked;
```

### 2. 新增查詢函數

#### getProfileData() - 綜合查詢
```javascript
// 新增的一次性查詢所有資料的函數
const profileInfo = await contract.getProfileData(playerAddress);
// 返回值結構
{
  experience: BigNumber,
  level: BigNumber,
  lastUpdate: BigNumber,      // Unix timestamp
  totalGained: BigNumber,
  isLocked: boolean
}
```

#### calculateLevel() - 公開的等級計算
```javascript
// 可以直接計算經驗值對應的等級
const level = await contract.calculateLevel(experienceAmount);
```

### 3. 新增常數

```javascript
// 新增的公開常數（可直接讀取）
const MAX_EXP_PER_TX = await contract.MAX_EXPERIENCE_PER_TRANSACTION(); // 10000
const MAX_TOTAL_EXP = await contract.MAX_TOTAL_EXPERIENCE();           // 1e9
const EXP_COOLDOWN = await contract.EXPERIENCE_COOLDOWN();             // 60 seconds
const MAX_LEVEL = await contract.MAX_LEVEL();                          // 1000
```

### 4. 禁用的 ERC721 功能

```javascript
// ❌ 這些函數現在會 revert
try {
  await contract.approve(spender, tokenId);
} catch (error) {
  // Error: "PlayerProfile: SBT cannot be approved"
}

try {
  await contract.setApprovalForAll(operator, approved);
} catch (error) {
  // Error: "PlayerProfile: SBT cannot be approved"
}

try {
  await contract.transferFrom(from, to, tokenId);
} catch (error) {
  // Error: "PlayerProfile: SBT cannot be transferred"
}

try {
  await contract.safeTransferFrom(from, to, tokenId);
} catch (error) {
  // Error: "PlayerProfile: SBT cannot be transferred"
}
```

### 5. 新增事件

```javascript
// 監聽新事件
contract.on("ProfileLocked", (tokenId, locked) => {
  console.log(`Profile ${tokenId} locked status: ${locked}`);
});

contract.on("ExperienceProviderUpdated", (provider, status) => {
  console.log(`Provider ${provider} status: ${status}`);
});

contract.on("EmergencyExperienceReset", (tokenId, oldExperience) => {
  console.log(`Profile ${tokenId} reset, old exp: ${oldExperience}`);
});
```

### 6. 批量操作

```javascript
// 新增批量添加經驗（僅限授權地址）
const players = [address1, address2, address3];
const amounts = [100, 200, 300];
await contract.batchAddExperience(players, amounts);
// 注意：最多 50 個地址
```

---

## DungeonStorage_Secured 變更

### 1. 新增查詢函數

```javascript
// 檢查合約是否被授權
const isAuthorized = await contract.authorizedContracts(contractAddress);

// 檢查緊急暫停狀態
const isPaused = await contract.emergencyPause();

// 查看所需授權數量
const required = await contract.requiredAuthorizations();
```

### 2. 角色管理

```javascript
// 角色常數
const LOGIC_CONTRACT_ROLE = await contract.LOGIC_CONTRACT_ROLE();
const EMERGENCY_ROLE = await contract.EMERGENCY_ROLE();
const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();

// 檢查角色
const hasRole = await contract.hasRole(LOGIC_CONTRACT_ROLE, address);
```

### 3. 新增事件

```javascript
// 授權管理事件
contract.on("AuthorizedContractAdded", (contractAddress) => {
  console.log(`Contract ${contractAddress} authorized`);
});

contract.on("EmergencyPauseToggled", (isPaused) => {
  console.log(`Emergency pause: ${isPaused}`);
});

// 數據更新事件
contract.on("DungeonUpdated", (dungeonId, data) => {
  console.log(`Dungeon ${dungeonId} updated`, data);
});

contract.on("PartyStatusUpdated", (partyId, data) => {
  console.log(`Party ${partyId} status updated`, data);
});
```

### 4. 批量操作限制

```javascript
// 批量設置地城（最多 10 個）
const ids = [0, 1, 2];
const dungeonData = [
  { requiredPower: 100, rewardAmountUSD: 10e18, baseSuccessRate: 50, isInitialized: true },
  { requiredPower: 200, rewardAmountUSD: 20e18, baseSuccessRate: 40, isInitialized: true },
  { requiredPower: 300, rewardAmountUSD: 30e18, baseSuccessRate: 30, isInitialized: true }
];
await contract.batchSetDungeons(ids, dungeonData);
```

---

## 其他合約變更摘要

### PlayerVault_Secured
- 新增 `totalVirtualBalance` 和 `totalVirtualCommissions` 查詢
- 新增 `checkSolvency()` 公開函數
- 新增 `EmergencyWithdraw` 事件

### Oracle_V22_Adaptive_Secured
- 新增 `MIN_SAFE_PERIOD` 常數 (300 秒)
- 新增 `MAX_PRICE_CHANGE_BPS` 常數 (2000 = 20%)
- 新增 `EmergencyPriceOverride` 事件
- 新增 `emergencyPrice` 查詢

### Hero_Secured / Relic_Secured
- 新增 `MAX_BATCH_SIZE` 常數 (50)
- 新增 `MAX_BATCH_SIZE_PER_BLOCK` 常數 (100)
- 新增 `mintedPerBlock` 查詢
- 批量鑄造現在有數量限制

### VIPStaking_Secured
- 所有函數添加 `nonReentrant`
- 新增 `pause()` / `unpause()` 功能
- 新增 `Pausable` 相關事件

---

## 錯誤訊息對照表

### PlayerProfile_Secured
| 錯誤訊息 | 說明 | 處理建議 |
|---------|------|----------|
| `PlayerProfile: SBT cannot be approved` | 嘗試批准 SBT | 移除批准邏輯 |
| `PlayerProfile: SBT cannot be transferred` | 嘗試轉移 SBT | 移除轉移功能 |
| `PlayerProfile: Profile is locked` | 檔案被鎖定 | 顯示鎖定提示 |
| `PlayerProfile: Experience update on cooldown` | 經驗更新冷卻中 | 顯示剩餘時間 |
| `PlayerProfile: Exceeds max experience` | 超過經驗上限 | 顯示上限提示 |
| `PlayerProfile: Exceeds max level` | 超過等級上限 | 顯示已達上限 |

### DungeonStorage_Secured
| 錯誤訊息 | 說明 | 處理建議 |
|---------|------|----------|
| `Storage: Emergency pause is active` | 緊急暫停中 | 顯示維護提示 |
| `Storage: Caller is not authorized` | 未授權調用 | 檢查權限 |
| `Storage: Too many operations` | 批量操作過多 | 分批處理 |

### 通用錯誤
| 錯誤訊息 | 說明 | 處理建議 |
|---------|------|----------|
| `Pausable: paused` | 合約已暫停 | 顯示維護中 |
| `ReentrancyGuard: reentrant call` | 重入攻擊保護 | 等待交易完成 |

---

## 整合建議

### 1. ABI 更新
- 重新生成所有 `_Secured` 合約的 ABI
- 更新前端的合約地址映射
- 確保 TypeScript 類型定義更新

### 2. 錯誤處理
```javascript
// 建議的錯誤處理模式
async function handleSecuredContract(contract, method, ...args) {
  try {
    const tx = await contract[method](...args);
    return await tx.wait();
  } catch (error) {
    if (error.message.includes("paused")) {
      showMaintenanceModal();
    } else if (error.message.includes("cooldown")) {
      showCooldownTimer();
    } else if (error.message.includes("locked")) {
      showLockedWarning();
    } else if (error.message.includes("cannot be transferred")) {
      showSBTExplanation();
    } else {
      showGenericError(error);
    }
  }
}
```

### 3. 狀態監控
```javascript
// 監控合約狀態
async function monitorContractStatus(contract) {
  // 檢查暫停狀態
  if (contract.paused) {
    const isPaused = await contract.paused();
    updateUIStatus({ paused: isPaused });
  }
  
  // 檢查緊急暫停
  if (contract.emergencyPause) {
    const isEmergencyPaused = await contract.emergencyPause();
    updateUIStatus({ emergency: isEmergencyPaused });
  }
}
```

### 4. 用戶體驗優化
- 添加冷卻時間倒計時顯示
- 顯示經驗值和等級上限進度條
- 解釋 SBT 不可轉移的特性
- 提供批量操作的進度指示

---

## 版本遷移檢查清單

- [ ] 更新所有合約 ABI 文件
- [ ] 更新 TypeScript 類型定義
- [ ] 修改結構體數據讀取邏輯
- [ ] 更新錯誤處理邏輯
- [ ] 添加新事件監聽器
- [ ] 測試所有禁用的功能
- [ ] 更新用戶界面提示文案
- [ ] 添加新功能的 UI 組件
- [ ] 測試批量操作限制
- [ ] 驗證角色和權限檢查

---

最後更新：2025-08-02