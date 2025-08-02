# 🔒 安全優化執行計劃

## 優化內容
1. ✅ **批次 save()** - 已經最優（檢查過了）
2. ⚡ **移除 log.info** - 保留 warning/error
3. 🎯 **使用常數** - 避免重複創建 BigInt

## 執行步驟

### 步驟 1：移除 log.info（5-8% 提升）
```bash
# 執行優化腳本
./optimize-logs.sh
```

這會：
- 備份原始檔案到 `src-backup-日期時間`
- 註解掉所有 `log.info`（不是刪除）
- 保留所有 `log.warning` 和 `log.error`

### 步驟 2：使用常數優化（2-3% 提升）

由於已經有 `constants.ts`，只需要在需要的檔案中使用：

**範例修改**：
```typescript
// 檔案頂部加入
import { ZERO, ONE } from "./constants"

// 原本
vault.pendingRewards = BigInt.fromI32(0)

// 改為
vault.pendingRewards = ZERO
```

但因為涉及大量檔案，建議：
1. 先部署測試現有優化效果
2. 之後再逐步替換常數

## 預期效果

| 優化項目 | 效果 | 風險 |
|---------|------|------|
| 移除 log.info | 5-8% | 無（可恢復） |
| 使用常數 | 2-3% | 無 |
| **總計** | **7-11%** | **極低** |

## 回滾方案

如果出現問題：
```bash
# 恢復原始檔案
cp -r src-backup-*/. src/
```

## 建議

1. 先執行 log 優化
2. 部署測試
3. 確認無誤後再做常數優化