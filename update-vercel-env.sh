#!/bin/bash

# Vercel 環境變量批量更新腳本
echo "正在更新 Vercel 環境變量..."

# 檢查是否已登錄
if ! vercel whoami > /dev/null 2>&1; then
    echo "請先登錄 Vercel: vercel login"
    exit 1
fi

# 新的合約地址
declare -A env_vars=(
    ["VITE_THEGRAPH_API_URL"]="https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.1.0"
    ["VITE_THE_GRAPH_API_URL"]="https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.1.0"
    ["VITE_THE_GRAPH_STUDIO_API_URL"]="https://api.studio.thegraph.com/query/115633/dungeon-delvers/v2.1.0"
    ["VITE_MAINNET_ORACLE_ADDRESS"]="0xc5bBFfFf552167D1328432AA856B752e9c4b4838"
    ["VITE_MAINNET_PLAYERVAULT_ADDRESS"]="0x6187DBCcb58088E414437A6b8d58a42cD2BD1ec4"
    ["VITE_MAINNET_ALTAROFASCENSION_ADDRESS"]="0x83a7fB85E0892A67041FcFc4c1F0F1111e5aB3DA"
    ["VITE_MAINNET_DUNGEONMASTER_ADDRESS"]="0xd14A5eFFc45D0131af3eb876992fC6eD9683f5B0"
    ["VITE_MAINNET_HERO_ADDRESS"]="0x4EFc389f5DE5DfBd0c8B158a2ea41B611aA30CDb"
    ["VITE_MAINNET_RELIC_ADDRESS"]="0x235d53Efd9cc5aB66F2C3B1E496Ab25767D673e0"
    ["VITE_MAINNET_PARTY_ADDRESS"]="0x5DC3175b6a1a5bB4Ec7846e8413257aB7CF31834"
    ["VITE_MAINNET_VIPSTAKING_ADDRESS"]="0x067F289Ae4e76CB61b8a138bF705798a928a12FB"
    ["VITE_MAINNET_PLAYERPROFILE_ADDRESS"]="0xd6385bc4099c2713383eD5cB9C6d10E750ADe312"
    ["VITE_MAINNET_DUNGEONCORE_ADDRESS"]="0x4CbAC0E4AEC9Ef3B11C93805483c23224ed1f118"
)

echo "開始更新環境變量..."

for var_name in "${!env_vars[@]}"; do
    var_value="${env_vars[$var_name]}"
    echo "更新 $var_name = $var_value"
    
    # 先刪除舊的環境變量（如果存在）
    vercel env rm "$var_name" production --yes 2>/dev/null || true
    
    # 添加新的環境變量
    echo "$var_value" | vercel env add "$var_name" production
    
    if [ $? -eq 0 ]; then
        echo "✅ $var_name 更新成功"
    else
        echo "❌ $var_name 更新失敗"
    fi
    
    sleep 1
done

echo ""
echo "🎉 所有環境變量更新完成！"
echo "正在觸發重新部署..."

# 觸發重新部署
vercel --prod

echo "✅ 部署已觸發，請查看 Vercel Dashboard 確認部署狀態"