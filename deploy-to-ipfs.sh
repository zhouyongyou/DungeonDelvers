#!/bin/bash

# Dungeon Delvers IPFS 部署腳本
# 這個腳本會自動上傳圖片和 metadata 到 IPFS

set -e

echo "🚀 開始 IPFS 部署流程..."

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

# 創建臨時目錄結構
echo "📁 創建目錄結構..."
mkdir -p ipfs-upload/images/{hero,relic,party,vip,profile}
mkdir -p ipfs-upload/metadata/{hero,relic,party,vip,profile}

# 複製圖片檔案
echo "🖼️  複製圖片檔案..."
cp ../DungeonDelvers/public/images/hero/hero-*.png ipfs-upload/images/hero/
cp ../DungeonDelvers/public/images/relic/relic-*.png ipfs-upload/images/relic/
cp ../DungeonDelvers/public/images/party/party.png ipfs-upload/images/party/
cp ../DungeonDelvers/public/images/vip/vip.png ipfs-upload/images/vip/
cp ../DungeonDelvers/public/images/profile/profile.png ipfs-upload/images/profile/

# 生成 metadata JSON 檔案
echo "📝 生成 metadata JSON 檔案..."

# Hero metadata
for rarity in 1 2 3 4 5; do
    case $rarity in
        1) rarity_name="Common"; base_power=32 ;;
        2) rarity_name="Uncommon"; base_power=75 ;;
        3) rarity_name="Rare"; base_power=125 ;;
        4) rarity_name="Epic"; base_power=175 ;;
        5) rarity_name="Legendary"; base_power=227 ;;
    esac
    
    cat > "ipfs-upload/metadata/hero/${rarity}.json" << EOF
{
  "name": "Dungeon Delvers Hero",
  "description": "A brave hero ready to explore the depths of dungeons. This ${rarity_name} hero possesses enhanced combat skills and can be upgraded through adventures.",
  "image": "ipfs://PLACEHOLDER_HASH/images/hero/hero-${rarity}.png",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": ${rarity},
      "display_type": "number"
    },
    {
      "trait_type": "Rarity Name",
      "value": "${rarity_name}"
    },
    {
      "trait_type": "Type",
      "value": "Hero"
    },
    {
      "trait_type": "Base Power",
      "value": ${base_power},
      "display_type": "number"
    }
  ]
}
EOF
done

# Relic metadata
for rarity in 1 2 3 4 5; do
    case $rarity in
        1) rarity_name="Common"; base_capacity=1 ;;
        2) rarity_name="Uncommon"; base_capacity=2 ;;
        3) rarity_name="Rare"; base_capacity=3 ;;
        4) rarity_name="Epic"; base_capacity=4 ;;
        5) rarity_name="Legendary"; base_capacity=5 ;;
    esac
    
    cat > "ipfs-upload/metadata/relic/${rarity}.json" << EOF
{
  "name": "Dungeon Delvers Relic",
  "description": "A magical artifact that provides storage capacity for heroes. This ${rarity_name} relic can hold ${base_capacity} hero${base_capacity > 1 ? 's' : ''}.",
  "image": "ipfs://PLACEHOLDER_HASH/images/relic/relic-${rarity}.png",
  "attributes": [
    {
      "trait_type": "Rarity",
      "value": ${rarity},
      "display_type": "number"
    },
    {
      "trait_type": "Rarity Name",
      "value": "${rarity_name}"
    },
    {
      "trait_type": "Type",
      "value": "Relic"
    },
    {
      "trait_type": "Base Capacity",
      "value": ${base_capacity},
      "display_type": "number"
    }
  ]
}
EOF
done

# Party metadata
cat > "ipfs-upload/metadata/party/party.json" << EOF
{
  "name": "Dungeon Delvers Party",
  "description": "A coordinated team of heroes and relics ready for dungeon exploration. Parties combine the strength of multiple heroes with the storage capacity of relics.",
  "image": "ipfs://PLACEHOLDER_HASH/images/party/party.png",
  "attributes": [
    {
      "trait_type": "Type",
      "value": "Party"
    },
    {
      "trait_type": "Description",
      "value": "Dynamic team composition"
    }
  ]
}
EOF

# VIP metadata
cat > "ipfs-upload/metadata/vip/vip.json" << EOF
{
  "name": "Dungeon Delvers VIP",
  "description": "A prestigious VIP membership that provides exclusive benefits and reduced transaction fees in the Dungeon Delvers ecosystem.",
  "image": "ipfs://PLACEHOLDER_HASH/images/vip/vip.png",
  "attributes": [
    {
      "trait_type": "Type",
      "value": "VIP Membership"
    },
    {
      "trait_type": "Benefits",
      "value": "Reduced fees, exclusive access"
    }
  ]
}
EOF

# Profile metadata
cat > "ipfs-upload/metadata/profile/profile.json" << EOF
{
  "name": "Dungeon Delvers Profile",
  "description": "A unique player profile that tracks your progress and achievements in the Dungeon Delvers universe.",
  "image": "ipfs://PLACEHOLDER_HASH/images/profile/profile.png",
  "attributes": [
    {
      "trait_type": "Type",
      "value": "Player Profile"
    },
    {
      "trait_type": "Purpose",
      "value": "Progress tracking"
    }
  ]
}
EOF

echo "📤 上傳圖片到 IPFS..."
cd ipfs-upload/images
IMAGES_HASH=$(ipfs add -r . | tail -n 1 | awk '{print $2}')
echo "✅ 圖片上傳完成，Hash: $IMAGES_HASH"

echo "📤 上傳 metadata 到 IPFS..."
cd ../metadata
METADATA_HASH=$(ipfs add -r . | tail -n 1 | awk '{print $2}')
echo "✅ Metadata 上傳完成，Hash: $METADATA_HASH"

echo "🔄 更新 metadata 中的圖片路徑..."
# 更新所有 metadata 檔案中的圖片路徑
find . -name "*.json" -exec sed -i '' "s/PLACEHOLDER_HASH/$IMAGES_HASH/g" {} \;

echo "📤 重新上傳更新後的 metadata..."
METADATA_FINAL_HASH=$(ipfs add -r . | tail -n 1 | awk '{print $2}')
echo "✅ 最終 metadata 上傳完成，Hash: $METADATA_FINAL_HASH"

echo ""
echo "🎉 IPFS 部署完成！"
echo ""
echo "📊 部署摘要："
echo "  圖片 Hash: $IMAGES_HASH"
echo "  Metadata Hash: $METADATA_FINAL_HASH"
echo ""
echo "🔗 訪問連結："
echo "  圖片: https://ipfs.io/ipfs/$IMAGES_HASH"
echo "  Metadata: https://ipfs.io/ipfs/$METADATA_FINAL_HASH"
echo ""
echo "📝 合約設定："
echo "  請將合約的 baseURI 設定為: ipfs://$METADATA_FINAL_HASH/"
echo ""
echo "🧹 清理臨時檔案..."
cd ../..
rm -rf ipfs-upload

echo "✅ 部署流程完成！" 