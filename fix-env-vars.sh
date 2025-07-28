#!/bin/bash
# 環境變數一致性修復腳本

echo "🔍 檢查環境變數一致性..."

# 創建備份
echo "📦 創建備份..."
cp -r src src.backup.env.$(date +%Y%m%d_%H%M%S) 2>/dev/null || true

# 修復環境變數命名不一致
echo "🔧 修復環境變數命名不一致..."

# 修復 USD Token 地址變數名
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "VITE_MAINNET_USD_ADDRESS" | while read file; do
    sed -i '' 's/VITE_MAINNET_USD_ADDRESS/VITE_MAINNET_USD_TOKEN_ADDRESS/g' "$file"
    echo "  ✓ 修復 $file 中的 USD Token 地址變數"
done

# 修復 SoulShard 地址變數名
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "VITE_MAINNET_SOULSHARD_ADDRESS" | while read file; do
    sed -i '' 's/VITE_MAINNET_SOULSHARD_ADDRESS/VITE_MAINNET_SOUL_SHARD_TOKEN_ADDRESS/g' "$file"
    echo "  ✓ 修復 $file 中的 SoulShard 地址變數"
done

# 修復 WalletConnect 變數名
find src -name "*.ts" -o -name "*.tsx" | xargs grep -l "VITE_WALLET_CONNECT_PROJECT_ID" | while read file; do
    sed -i '' 's/VITE_WALLET_CONNECT_PROJECT_ID/VITE_WALLETCONNECT_PROJECT_ID/g' "$file"
    echo "  ✓ 修復 $file 中的 WalletConnect 變數"
done

# 生成環境變數使用報告
echo -e "\n📊 生成環境變數使用報告..."
echo "## 環境變數使用報告" > env-vars-report.md
echo "生成時間: $(date)" >> env-vars-report.md
echo "" >> env-vars-report.md

echo "### 使用的環境變數" >> env-vars-report.md
grep -r "import\.meta\.env\.VITE_" src --include="*.ts" --include="*.tsx" | \
    grep -o "VITE_[A-Z_]*" | sort | uniq | while read var; do
    count=$(grep -r "$var" src --include="*.ts" --include="*.tsx" | wc -l)
    echo "- $var (使用 $count 次)" >> env-vars-report.md
done

echo "" >> env-vars-report.md
echo "### 建議的 .env.example 內容" >> env-vars-report.md
echo '```bash' >> env-vars-report.md
grep -r "import\.meta\.env\.VITE_" src --include="*.ts" --include="*.tsx" | \
    grep -o "VITE_[A-Z_]*" | sort | uniq | while read var; do
    echo "$var=" >> env-vars-report.md
done
echo '```' >> env-vars-report.md

echo -e "\n✅ 修復完成！"
echo "📄 查看 env-vars-report.md 獲取詳細報告"