# 快取管理指南

## 🗂️ 快取類型與清除方法

### 1. 本地開發快取

#### Node.js 依賴快取
```bash
# 完全清除並重新安裝
rm -rf node_modules package-lock.json
npm install
```

#### Vite 開發服務器快取
```bash
# 清除 Vite 快取
rm -rf node_modules/.vite
# 或在運行時強制刷新
npm run dev -- --force
```

#### TypeScript 編譯快取
```bash
# 清除 TypeScript 增量編譯快取
rm -rf tsconfig.tsbuildinfo
rm -rf dist
```

### 2. 瀏覽器快取

#### 開發時快速刷新
- **Mac**: `Cmd + Shift + R`
- **Windows**: `Ctrl + Shift + F5`
- **開發者工具**: Network 標籤 → 勾選 "Disable cache"

#### localStorage 清除（RPC 遷移群組）
```javascript
// 在瀏覽器 Console 執行
localStorage.removeItem('rpc-migration-group');
// 或清除所有
localStorage.clear();
```

### 3. Vercel 部署快取

#### 方法 1：通過 Dashboard
1. 進入 Vercel Dashboard
2. 選擇你的專案
3. 點擊 "Settings" → "Functions"
4. 找到最新部署，點擊 "Redeploy"
5. **重要**：取消勾選 "Use existing Build Cache"

#### 方法 2：通過 CLI
```bash
# 安裝 Vercel CLI（如果還沒有）
npm i -g vercel

# 強制重新部署，不使用快取
vercel --force
```

### 4. CDN / 邊緣快取

#### Vercel Edge Network
- 自動在新部署時清除
- 可以在 Dashboard 手動清除：
  - Settings → Domains → "Purge Cache"

#### 瀏覽器強制刷新特定資源
```javascript
// 添加版本參數強制刷新
fetch('/api/rpc-optimized?v=' + Date.now())
```

### 5. Git 快取（如果遇到檔案追蹤問題）

```bash
# 清除 Git 快取（小心使用）
git rm -r --cached .
git add .
git commit -m "Clear git cache"
```

## 🚀 快速清除腳本

使用我們提供的腳本：
```bash
# 執行完整清除
./scripts/clear-cache.sh
```

## 📅 建議的清除時機

### 需要清除快取的情況：
1. **依賴更新後**
   - 執行 `npm update` 或修改 `package.json` 後
   - 清除 `node_modules` 和 `package-lock.json`

2. **Vite 配置更改後**
   - 修改 `vite.config.ts` 後
   - 清除 `.vite` 快取資料夾

3. **部署出現問題時**
   - Vercel 部署失敗或行為異常
   - 使用 "Redeploy without cache"

4. **RPC 遷移測試**
   - 測試不同流量比例時
   - 清除 `localStorage` 的群組分配

### 不需要經常清除的：
- `dist` 資料夾（每次 build 會自動覆蓋）
- `.next` 快取（我們用 Vite，不是 Next.js）
- 瀏覽器快取（除非測試特定功能）

## 🛠️ 自動化建議

### 在 package.json 添加快取清除指令
```json
{
  "scripts": {
    "clean": "rm -rf node_modules dist .vite",
    "clean:install": "npm run clean && npm install",
    "dev:fresh": "npm run clean && npm install && npm run dev",
    "build:fresh": "npm run clean && npm install && npm run build"
  }
}
```

### 使用 husky 自動清理（可選）
```bash
# 在特定 Git hooks 時自動清理
npm install --save-dev husky
npx husky add .husky/post-merge "rm -rf node_modules/.vite"
```

## ⚠️ 注意事項

1. **不要過度清除快取**
   - 快取能顯著提升開發速度
   - 只在必要時清除

2. **備份重要設定**
   - 清除 `localStorage` 前考慮備份
   - 某些使用者偏好設定可能會遺失

3. **團隊協作**
   - 告知團隊成員你清除了快取
   - 特別是如果影響到共享資源

## 🔍 診斷快取問題

### 檢查是否為快取問題：
1. 在無痕/隱私模式測試
2. 使用不同瀏覽器測試
3. 清除特定快取後重試
4. 檢查網路請求是否返回 304 (Not Modified)

### 常見快取相關錯誤：
- "Module not found" → 清除 node_modules
- "Stale file handle" → 清除 Vite 快取
- "MIME type mismatch" → 清除瀏覽器快取
- "Deployment not updating" → 清除 Vercel 快取