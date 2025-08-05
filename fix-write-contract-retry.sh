#!/bin/bash

# 修復 Rabby 錢包重複彈窗問題
# 將所有 useWriteContract 替換為 useWriteContractNoRetry

echo "🔧 開始修復 Rabby 錢包重複彈窗問題..."

# 需要替換的文件列表（排除測試文件和已修復的文件）
files=(
  "src/components/V3AuthorizationNotice.tsx"
  "src/components/V3MigrationNotice.tsx"
  "src/components/admin/FundsWithdrawal.tsx"
  "src/components/admin/ExpeditionTestComponent.tsx"
  "src/components/admin/SettingRow.tsx"
  "src/components/admin/DungeonManager.tsx"
  "src/components/admin/AltarRuleManagerDark.tsx"
  "src/components/admin/PausableContractsManager.tsx"
  "src/components/admin/FundsWithdrawalDark.tsx"
  "src/components/admin/VipSettingsManagerDark.tsx"
  "src/components/admin/AltarRuleManager.tsx"
  "src/components/admin/VipSettingsManager.tsx"
  "src/components/admin/SettingRowDark.tsx"
  "src/components/admin/GlobalRewardSettings.tsx"
  "src/components/admin/DungeonManagerDark.tsx"
  "src/components/ApprovalHelper.tsx"
  "src/components/altar/AltarNftAuthManager.tsx"
  "src/hooks/useCommitReveal.ts"
  "src/hooks/useTransactionWithProgress.ts"
  "src/hooks/useContractTransaction.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "📝 處理 $file..."
    
    # 替換 import 語句
    sed -i '' "s/import { useWriteContract }/import { useWriteContractNoRetry as useWriteContract }/g" "$file"
    sed -i '' "s/import { \\(.*\\), useWriteContract }/import { \\1, useWriteContractNoRetry as useWriteContract }/g" "$file"
    sed -i '' "s/import { useWriteContract, \\(.*\\) }/import { useWriteContractNoRetry as useWriteContract, \\1 }/g" "$file"
    
    # 添加 import（如果還沒有）
    if ! grep -q "useWriteContractNoRetry" "$file"; then
      # 找到第一個 wagmi import 並在其後添加
      sed -i '' "/from 'wagmi';/a\\
import { useWriteContractNoRetry as useWriteContract } from '../hooks/useWriteContractNoRetry';
" "$file"
    fi
  fi
done

echo "✅ 修復完成！"
echo ""
echo "📋 下一步："
echo "1. 執行 npm run type-check 檢查類型"
echo "2. 執行 npm run lint 檢查代碼規範"
echo "3. 重新測試交易功能"