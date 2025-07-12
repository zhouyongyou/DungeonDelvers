#!/bin/bash

# Dungeon Delvers JSON 部署腳本
# 只上傳 JSON metadata 檔案到 IPFS

set -e

echo "🚀 開始 JSON metadata 部署..."

# 檢查必要工具
if ! command -v ipfs &> /dev/null; then
    echo "❌ 請先安裝 IPFS CLI"
    echo "安裝指令: https://docs.ipfs.io/install/command-line/"
    exit 1
fi

# 檢查 IPFS 節點是否運行
if ! ipfs id &> /dev/null; then
    echo "❌ IPFS 節點未運行，請先啟動 IPFS daemon"
    echo "啟動指令: ipfs daemon"
    exit 1
fi

echo "📤 上傳 metadata JSON 檔案到 IPFS..."
cd ipfs-metadata
METADATA_HASH=$(ipfs add -r . | tail -n 1 | awk '{print $2}')
echo "✅ Metadata 上傳完成，Hash: $METADATA_HASH"

echo ""
echo "🎉 JSON 部署完成！"
echo ""
echo "📊 部署摘要："
echo "  Metadata Hash: $METADATA_HASH"
echo "  圖片 Hash: bafybeigpli7ddzkuwpvlaks7jvimvkzlm4z6qo76la7wp522jmhrhpubgm"
echo ""
echo "📁 部署的檔案："
echo "  Hero: 5 個稀有度 (1-5)"
echo "  Relic: 5 個稀有度 (1-5)"
echo "  Party: 1 個"
echo "  VIP: 1 個"
echo "  Profile: 1 個"
echo "  總計: 13 個 JSON 檔案"
echo ""
echo "🔗 訪問連結："
echo "  Metadata: https://ipfs.io/ipfs/$METADATA_HASH"
echo "  圖片: https://ipfs.io/ipfs/bafybeigpli7ddzkuwpvlaks7jvimvkzlm4z6qo76la7wp522jmhrhpubgm"
echo ""
echo "📝 合約設定："
echo "  請將合約的 baseURI 設定為: ipfs://$METADATA_HASH/"
echo ""
echo "🔗 具體檔案連結："
echo "  Hero Common: ipfs://$METADATA_HASH/hero-1.json"
echo "  Hero Uncommon: ipfs://$METADATA_HASH/hero-2.json"
echo "  Hero Rare: ipfs://$METADATA_HASH/hero-3.json"
echo "  Hero Epic: ipfs://$METADATA_HASH/hero-4.json"
echo "  Hero Legendary: ipfs://$METADATA_HASH/hero-5.json"
echo "  Relic Common: ipfs://$METADATA_HASH/relic-1.json"
echo "  Relic Uncommon: ipfs://$METADATA_HASH/relic-2.json"
echo "  Relic Rare: ipfs://$METADATA_HASH/relic-3.json"
echo "  Relic Epic: ipfs://$METADATA_HASH/relic-4.json"
echo "  Relic Legendary: ipfs://$METADATA_HASH/relic-5.json"
echo "  Party: ipfs://$METADATA_HASH/party.json"
echo "  VIP: ipfs://$METADATA_HASH/vip.json"
echo "  Profile: ipfs://$METADATA_HASH/profile.json"
echo ""
echo "✅ 部署流程完成！" 