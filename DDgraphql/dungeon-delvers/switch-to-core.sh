#!/bin/bash
# 切換到輕量版子圖（移除市場功能）

echo "🔄 切換到輕量版子圖配置..."

# 1. 備份當前完整版配置
echo "📦 備份當前配置..."
cp subgraph.yaml subgraph-with-marketplace-backup-$(date +%Y%m%d-%H%M%S).yaml
echo "✅ 已備份為: subgraph-with-marketplace-backup-$(date +%Y%m%d-%H%M%S).yaml"

# 2. 切換到輕量版配置
echo "🔄 切換到輕量版配置..."
cp subgraph-core-only.yaml subgraph.yaml
echo "✅ 已切換到輕量版配置"

# 3. 顯示變更摘要
echo ""
echo "📋 配置變更摘要:"
echo "  ❌ 移除: DungeonMarketplaceV2 (市場交易)"
echo "  ❌ 移除: OfferSystemV2 (報價系統)"
echo "  ✅ 保留: Hero, Relic, Party, VIP, Profile, Dungeon, Vault, Altar"
echo ""
echo "🚀 現在可以執行部署命令:"
echo "  graph build"
echo "  graph deploy dungeon-delvers---bsc"
echo ""
echo "🔄 如需恢復完整版:"
echo "  ./restore-marketplace.sh"