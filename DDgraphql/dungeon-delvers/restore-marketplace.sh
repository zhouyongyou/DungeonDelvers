#!/bin/bash
# 恢復市場功能子圖配置

echo "🔄 恢復市場功能..."

# 查找最新的備份檔案
LATEST_BACKUP=$(ls -t subgraph-with-marketplace-backup-*.yaml 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ 找不到市場功能備份檔案"
    echo "💡 請檢查是否有 subgraph-with-marketplace-backup-*.yaml 檔案"
    exit 1
fi

echo "📦 找到備份檔案: $LATEST_BACKUP"
echo "🔄 恢復市場功能配置..."

# 備份當前輕量版配置
cp subgraph.yaml subgraph-core-backup-$(date +%Y%m%d-%H%M%S).yaml

# 恢復市場功能配置
cp "$LATEST_BACKUP" subgraph.yaml

echo "✅ 已恢復市場功能配置"
echo ""
echo "📋 配置變更摘要:"
echo "  ✅ 恢復: DungeonMarketplaceV2 (市場交易)"
echo "  ✅ 恢復: OfferSystemV2 (報價系統)"
echo "  ✅ 保留: 所有核心功能"
echo ""
echo "🚀 現在可以執行部署命令:"
echo "  graph build"
echo "  graph deploy dungeon-delvers---bsc"
echo ""
echo "⚠️  注意: 恢復後可能需要較長時間重新索引歷史資料"