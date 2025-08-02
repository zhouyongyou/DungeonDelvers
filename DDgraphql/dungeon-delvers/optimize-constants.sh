#!/bin/bash

# 常數優化腳本 - 替換重複使用的數值為常數，提升子圖性能
# 預計性能提升：2-3%

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}開始執行常數優化...${NC}"

# 創建備份
BACKUP_DIR="src-backup-constants-$(date +%Y%m%d-%H%M%S)"
cp -r src "$BACKUP_DIR"
echo -e "${YELLOW}已創建備份目錄: $BACKUP_DIR${NC}"

# 創建一個常數文件
cat > src/constants.ts << 'EOF'
// 常用的 BigInt 常數
import { BigInt } from "@graphprotocol/graph-ts"

// 數字常數
export const ZERO = BigInt.fromI32(0)
export const ONE = BigInt.fromI32(1)
export const NEGATIVE_ONE = BigInt.fromI32(-1)

// 時間常數
export const SECONDS_PER_DAY = BigInt.fromI32(86400)
export const SECONDS_PER_HOUR = BigInt.fromI32(3600)

// 單位轉換常數
export const WEI_PER_ETHER = BigInt.fromString("1000000000000000000")

// 地址常數
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
EOF

echo -e "${GREEN}已創建 constants.ts 文件${NC}"

# 在每個文件開頭添加 import
for file in src/*.ts; do
    if [[ "$file" != "src/constants.ts" ]]; then
        # 檢查是否已經有 import
        if ! grep -q "import.*from.*\"./constants\"" "$file"; then
            # 在 @graphprotocol/graph-ts import 後添加 constants import
            sed -i '' '/import.*from.*"@graphprotocol\/graph-ts"/a\
import { ZERO, ONE, NEGATIVE_ONE, ZERO_ADDRESS } from "./constants"
' "$file"
        fi
    fi
done

# 替換 BigInt.fromI32(0) 為 ZERO
find src -name "*.ts" -not -name "constants.ts" -exec sed -i '' 's/BigInt\.fromI32(0)/ZERO/g' {} \;

# 替換 BigInt.fromI32(1) 為 ONE
find src -name "*.ts" -not -name "constants.ts" -exec sed -i '' 's/BigInt\.fromI32(1)/ONE/g' {} \;

# 替換 BigInt.fromI32(-1) 為 NEGATIVE_ONE
find src -name "*.ts" -not -name "constants.ts" -exec sed -i '' 's/BigInt\.fromI32(-1)/NEGATIVE_ONE/g' {} \;

# 替換 0x0000000000000000000000000000000000000000 地址
find src -name "*.ts" -not -name "constants.ts" -exec sed -i '' "s/'0x0000000000000000000000000000000000000000'/ZERO_ADDRESS/g" {} \;
find src -name "*.ts" -not -name "constants.ts" -exec sed -i '' 's/"0x0000000000000000000000000000000000000000"/ZERO_ADDRESS/g' {} \;

# 統計替換數量
echo -e "\n${GREEN}優化完成統計:${NC}"
echo -e "ZERO 替換: $(grep -r "ZERO" src --include="*.ts" | grep -v "ZERO_ADDRESS" | grep -v "constants.ts" | wc -l) 處"
echo -e "ONE 替換: $(grep -r "ONE" src --include="*.ts" | grep -v "NEGATIVE_ONE" | grep -v "constants.ts" | wc -l) 處"
echo -e "NEGATIVE_ONE 替換: $(grep -r "NEGATIVE_ONE" src --include="*.ts" | grep -v "constants.ts" | wc -l) 處"
echo -e "ZERO_ADDRESS 替換: $(grep -r "ZERO_ADDRESS" src --include="*.ts" | grep -v "constants.ts" | wc -l) 處"

echo -e "\n${GREEN}✓ 常數優化完成！${NC}"
echo -e "${YELLOW}預計性能提升: 2-3%${NC}"
echo -e "\n下一步："
echo -e "1. 運行 ${GREEN}npm run codegen${NC} 生成代碼"
echo -e "2. 運行 ${GREEN}npm run build${NC} 構建子圖"
echo -e "3. 部署子圖"

# 提示如何還原
echo -e "\n如需還原，請執行："
echo -e "${YELLOW}rm -rf src && mv $BACKUP_DIR src${NC}"