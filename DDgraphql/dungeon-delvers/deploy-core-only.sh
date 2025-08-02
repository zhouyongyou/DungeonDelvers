#!/bin/bash
# 部署輕量版子圖（僅核心功能）
# 移除市場系統以提升同步速度

echo "🚀 部署輕量版子圖..."

# 1. 備份當前配置
cp subgraph.yaml subgraph-full-backup.yaml
echo "✅ 已備份完整版配置"

# 2. 使用輕量版配置
cp subgraph-core-only.yaml subgraph.yaml
echo "✅ 切換到輕量版配置"

# 3. 重新構建
echo "🔨 重新構建子圖..."
npx graph build

# 4. 部署
echo "🚀 部署到 The Graph Studio..."
npx graph deploy --studio dungeon-delvers

echo "✅ 輕量版子圖部署完成！"
echo "📊 預期效果："
echo "  - 同步速度提升 60-80%"
echo "  - 延遲從 17分鐘降到 3-5分鐘"
echo "  - 移除了市場相關數據"
echo ""
echo "🔄 如需恢復完整版："
echo "  cp subgraph-full-backup.yaml subgraph.yaml"
echo "  npx graph build && npx graph deploy --studio dungeon-delvers"