#!/bin/bash

# Vercel 環境變量批量更新腳本
echo "正在更新 Vercel 環境變量..."

# 檢查是否已登錄
if ! vercel whoami > /dev/null 2>&1; then
    echo "請先登錄 Vercel: vercel login"
    exit 1
fi

# V25 合約地址和子圖配置
declare -A env_vars=(
    ["VITE_THE_GRAPH_STUDIO_API_URL"]="https://api.studio.thegraph.com/query/115633/dungeon-delvers---bsc/v3.3.6"
    ["VITE_THE_GRAPH_DECENTRALIZED_API_URL"]="https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs"
    ["VITE_ORACLE_ADDRESS"]="0xf21548F8836d0ddB87293C4bCe2B020D17fF11c1"
    ["VITE_PLAYERVAULT_ADDRESS"]="0x2746Ce8D6Aa7A885c568530abD9846460cA602f1"
    ["VITE_ALTAROFASCENSION_ADDRESS"]="0xbaA5CC63F9d531288e4BD87De64Af05FdA481ED9"
    ["VITE_DUNGEONMASTER_ADDRESS"]="0x2F78de7Fdc08E95616458038a7A1E2EE28e0fa85"
    ["VITE_HERO_ADDRESS"]="0x785a8b7d7b2E64c5971D8f548a45B7db3CcA5797"
    ["VITE_RELIC_ADDRESS"]="0xaa7434e77343cd4AaE7dDea2f19Cb86232727D0d"
    ["VITE_PARTY_ADDRESS"]="0x2890F2bFe5ff4655d3096eC5521be58Eba6fAE50"
    ["VITE_VIPSTAKING_ADDRESS"]="0x58A16F4845BA7Fea4377399d74D50d8aeE58fde4"
    ["VITE_PLAYERPROFILE_ADDRESS"]="0xF1b836D09A30C433A2479a856c84e0d64DBBD973"
    ["VITE_DUNGEONCORE_ADDRESS"]="0xB8A111Ce09beCC7Aac7C4058f990b57ead635c58"
    ["VITE_DUNGEONSTORAGE_ADDRESS"]="0xB5cf98A61682C4e0bd66124DcbF5fB794B584d8D"
    ["VITE_SOULSHARD_ADDRESS"]="0x97B2C2a9A11C7b6A020b4bAEaAd349865eaD0bcF"
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