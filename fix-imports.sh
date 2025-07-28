#!/bin/bash
# Import/Export 錯誤修復腳本

echo "🔧 開始修復 import/export 錯誤..."

# 創建備份
echo "📦 創建備份..."
cp -r src src.backup.$(date +%Y%m%d_%H%M%S)

# 修復 archived 目錄中的相對路徑
echo "🔄 修復 archived 目錄的導入路徑..."
find src/pages/archived -name "*.tsx" -type f | while read file; do
    # 修復 '../config' -> '../../config'
    sed -i '' 's|from '\''\.\.\/config|from '\''\.\.\/\.\.\/config|g' "$file"
    # 修復 '../hooks' -> '../../hooks'
    sed -i '' 's|from '\''\.\.\/hooks|from '\''\.\.\/\.\.\/hooks|g' "$file"
    # 修復 '../utils' -> '../../utils'
    sed -i '' 's|from '\''\.\.\/utils|from '\''\.\.\/\.\.\/utils|g' "$file"
    # 修復 '../components' -> '../../components'
    sed -i '' 's|from '\''\.\.\/components|from '\''\.\.\/\.\.\/components|g' "$file"
    # 修復 '../contexts' -> '../../contexts'
    sed -i '' 's|from '\''\.\.\/contexts|from '\''\.\.\/\.\.\/contexts|g' "$file"
    # 修復 '../api' -> '../../api'
    sed -i '' 's|from '\''\.\.\/api|from '\''\.\.\/\.\.\/api|g' "$file"
    # 修復 '../stores' -> '../../stores'
    sed -i '' 's|from '\''\.\.\/stores|from '\''\.\.\/\.\.\/stores|g' "$file"
done

# 檢查並報告未使用的導入
echo "🔍 檢查未使用的導入..."
npx eslint src --ext .ts,.tsx --rule 'no-unused-vars: error' --no-eslintrc || true

echo "✅ 修復完成！"
echo "💡 建議："
echo "   1. 運行 'npm run build' 驗證修復"
echo "   2. 運行 'npm run type-check' 檢查類型"
echo "   3. 如有問題，可從備份恢復：cp -r src.backup.* src"