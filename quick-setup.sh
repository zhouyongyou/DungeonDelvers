#!/bin/bash

# 🚀 Dungeon Delvers 測試與效能優化 - 快速設置腳本

echo "🚀 開始設置 Dungeon Delvers 測試與效能優化..."

# 顏色定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 檢查 Node.js 版本
echo -e "${YELLOW}檢查 Node.js 版本...${NC}"
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo -e "${RED}錯誤: 需要 Node.js 18 或更高版本${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js 版本檢查通過${NC}"

# Phase 1: 安裝測試依賴
echo -e "${YELLOW}📦 Phase 1: 安裝測試相關依賴...${NC}"
npm install --save-dev \
    vitest \
    jsdom \
    @vitest/ui \
    @testing-library/react \
    @testing-library/jest-dom \
    @testing-library/user-event \
    @types/node \
    msw

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 測試依賴安裝完成${NC}"
else
    echo -e "${RED}❌ 測試依賴安裝失敗${NC}"
    exit 1
fi

# Phase 2: 安裝效能優化依賴
echo -e "${YELLOW}📦 Phase 2: 安裝效能優化依賴...${NC}"
npm install --save-dev \
    rollup-plugin-visualizer \
    prettier

npm install \
    @tanstack/react-virtual \
    web-vitals

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 效能優化依賴安裝完成${NC}"
else
    echo -e "${RED}❌ 效能優化依賴安裝失敗${NC}"
    exit 1
fi

# Phase 3: 安裝 E2E 測試 (可選)
read -p "是否安裝 Playwright E2E 測試? (y/n): " install_playwright
if [ "$install_playwright" = "y" ] || [ "$install_playwright" = "Y" ]; then
    echo -e "${YELLOW}📦 安裝 Playwright...${NC}"
    npm install --save-dev @playwright/test
    npx playwright install chromium
    echo -e "${GREEN}✅ Playwright 安裝完成${NC}"
fi

# Phase 4: 安裝智能合約測試 (可選)
read -p "是否安裝 Hardhat 智能合約測試? (y/n): " install_hardhat
if [ "$install_hardhat" = "y" ] || [ "$install_hardhat" = "Y" ]; then
    echo -e "${YELLOW}📦 安裝 Hardhat...${NC}"
    npm install --save-dev \
        hardhat \
        @nomicfoundation/hardhat-toolbox \
        @nomicfoundation/hardhat-chai-matchers \
        @typechain/hardhat \
        hardhat-gas-reporter
    echo -e "${GREEN}✅ Hardhat 安裝完成${NC}"
fi

# 創建必要的目錄
echo -e "${YELLOW}📁 創建目錄結構...${NC}"
mkdir -p src/test/components
mkdir -p src/test/hooks
mkdir -p src/test/mocks
mkdir -p e2e
mkdir -p test

# 更新 package.json 腳本
echo -e "${YELLOW}📝 更新 package.json 腳本...${NC}"

# 備份原始 package.json
cp package.json package.json.backup

# 使用 Node.js 來更新 package.json
node -e "
const fs = require('fs');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// 添加新的腳本
const newScripts = {
  'type-check': 'tsc --noEmit',
  'test': 'vitest',
  'test:ui': 'vitest --ui',
  'test:run': 'vitest run',
  'test:coverage': 'vitest run --coverage',
  'test:watch': 'vitest --watch',
  'analyze': 'vite build --mode analyze',
  'format': 'prettier --write \"src/**/*.{ts,tsx,js,jsx}\"',
  'format:check': 'prettier --check \"src/**/*.{ts,tsx,js,jsx}\"'
};

if ('$install_playwright' === 'y' || '$install_playwright' === 'Y') {
  newScripts['test:e2e'] = 'playwright test';
  newScripts['test:e2e:ui'] = 'playwright test --ui';
  newScripts['test:e2e:headed'] = 'playwright test --headed';
}

if ('$install_hardhat' === 'y' || '$install_hardhat' === 'Y') {
  newScripts['hardhat:compile'] = 'hardhat compile';
  newScripts['hardhat:test'] = 'hardhat test';
  newScripts['hardhat:test:gas'] = 'REPORT_GAS=true hardhat test';
}

packageJson.scripts = { ...packageJson.scripts, ...newScripts };

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
"

echo -e "${GREEN}✅ package.json 更新完成${NC}"

# 創建 .prettierrc
echo -e "${YELLOW}📝 創建 Prettier 配置...${NC}"
cat > .prettierrc << EOF
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
EOF

# 創建 .prettierignore
cat > .prettierignore << EOF
dist/
node_modules/
coverage/
typechain-types/
*.md
*.json
EOF

echo -e "${GREEN}✅ Prettier 配置創建完成${NC}"

# 運行第一次測試
echo -e "${YELLOW}🧪 運行初始測試...${NC}"
npm run test:run 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ 測試環境設置成功！${NC}"
else
    echo -e "${YELLOW}⚠️  測試環境已設置，但需要編寫測試文件${NC}"
fi

# 格式化代碼
echo -e "${YELLOW}💅 格式化現有代碼...${NC}"
npm run format 2>/dev/null || echo -e "${YELLOW}⚠️  代碼格式化跳過（某些文件可能有問題）${NC}"

# 運行類型檢查
echo -e "${YELLOW}🔍 執行類型檢查...${NC}"
npm run type-check 2>/dev/null || echo -e "${YELLOW}⚠️  類型檢查發現問題，請檢查 TypeScript 配置${NC}"

# 總結報告
echo ""
echo -e "${GREEN}🎉 設置完成！${NC}"
echo ""
echo -e "${YELLOW}📋 接下來的步驟:${NC}"
echo "1. 查看生成的配置文件："
echo "   - vitest.config.ts (測試配置)"
echo "   - src/test/setup.ts (測試環境設置)"
echo "   - .prettierrc (代碼格式化)"
echo ""
echo "2. 可用的新命令："
echo "   npm run test           # 運行測試（watch 模式）"
echo "   npm run test:run       # 運行所有測試"
echo "   npm run test:coverage  # 生成覆蓋率報告"
echo "   npm run format         # 格式化代碼"
echo "   npm run analyze        # 分析 bundle 大小"
echo ""
echo "3. 開始編寫測試："
echo "   - 組件測試: src/test/components/"
echo "   - Hook 測試: src/test/hooks/"
if [ "$install_playwright" = "y" ] || [ "$install_playwright" = "Y" ]; then
echo "   - E2E 測試: e2e/"
fi
if [ "$install_hardhat" = "y" ] || [ "$install_hardhat" = "Y" ]; then
echo "   - 合約測試: test/"
fi
echo ""
echo -e "${GREEN}查看詳細指南: optimization-guide.md 和 setup-optimization.md${NC}"
echo ""
echo -e "${YELLOW}🚀 開始優化您的專案吧！${NC}"