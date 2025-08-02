#!/bin/bash
# 安全優化腳本 - 只移除 log.info，保留 warning 和 error

echo "🔧 開始優化子圖日誌..."

# 1. 備份原始檔案
echo "📦 備份原始檔案..."
cp -r src src-backup-$(date +%Y%m%d-%H%M%S)

# 2. 計算現有 log 數量
echo "📊 統計現有日誌..."
INFO_COUNT=$(grep -r "log\.info" src/ | wc -l)
WARNING_COUNT=$(grep -r "log\.warning" src/ | wc -l)
ERROR_COUNT=$(grep -r "log\.error" src/ | wc -l)

echo "  - log.info: $INFO_COUNT 個"
echo "  - log.warning: $WARNING_COUNT 個"
echo "  - log.error: $ERROR_COUNT 個"

# 3. 註解掉所有 log.info（不是刪除，方便以後恢復）
echo "🔧 註解掉 log.info..."
find src -name "*.ts" -type f -exec sed -i.bak 's/^[[:space:]]*log\.info/    \/\/ log\.info/g' {} \;

# 4. 清理備份檔案
find src -name "*.ts.bak" -delete

# 5. 驗證結果
echo "✅ 優化完成！"
NEW_INFO_COUNT=$(grep -r "^[[:space:]]*log\.info" src/ | wc -l)
echo "  - 剩餘未註解的 log.info: $NEW_INFO_COUNT 個"
echo "  - 保留的 log.warning: $WARNING_COUNT 個"
echo "  - 保留的 log.error: $ERROR_COUNT 個"

echo ""
echo "💡 提示："
echo "  - 原始檔案已備份到 src-backup-$(date +%Y%m%d-%H%M%S)"
echo "  - log.info 已被註解（不是刪除）"
echo "  - log.warning 和 log.error 保持不變"
echo "  - 如需恢復：cp -r src-backup-*/. src/"