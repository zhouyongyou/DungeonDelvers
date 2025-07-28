#!/bin/bash

# 清除各種快取的腳本

echo "🧹 開始清除快取..."

# 1. 清除 Node.js 模組快取
echo "📦 清除 node_modules..."
rm -rf node_modules
rm -f package-lock.json

# 2. 清除 Vite 快取
echo "⚡ 清除 Vite 快取..."
rm -rf node_modules/.vite
rm -rf dist

# 3. 清除 TypeScript 快取
echo "📘 清除 TypeScript 快取..."
rm -rf tsconfig.tsbuildinfo

# 4. 清除 ESLint 快取
echo "🔍 清除 ESLint 快取..."
rm -rf .eslintcache

# 5. 清除 npm 快取
echo "📚 清除 npm 快取..."
npm cache clean --force

# 6. 清除系統 DNS 快取 (macOS)
echo "🌐 清除 DNS 快取..."
sudo dscacheutil -flushcache 2>/dev/null || echo "跳過 DNS 快取清除"

# 7. 重新安裝依賴
echo "📥 重新安裝依賴..."
npm install

echo "✅ 快取清除完成！"
echo ""
echo "💡 提示："
echo "  - Vercel 部署快取需要在 Dashboard 中清除"
echo "  - 瀏覽器快取請使用 Cmd+Shift+R (Mac) 或 Ctrl+Shift+F5 (Windows)"
echo "  - localStorage 可以在瀏覽器開發者工具中清除"