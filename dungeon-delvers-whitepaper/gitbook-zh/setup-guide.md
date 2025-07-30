# 📖 GitBook 中文版設置指南

本指南幫助您快速設置和發布 Soulbound Saga 的中文 GitBook 文檔。

## 🚀 快速開始

### 1. GitBook 賬號設置

1. 訪問 [GitBook.com](https://www.gitbook.com/)
2. 使用 GitHub 賬號登錄（推薦）或創建新賬號
3. 選擇免費計劃（足夠個人/小團隊使用）

### 2. 創建新的 Space

1. 點擊 "New Space"
2. 命名為 "Soulbound Saga 遊戲指南"
3. 選擇 "Public" 可見性
4. 選擇 "Documentation" 模板

### 3. 同步 GitHub 倉庫

**方法一：GitBook GitHub 集成**
1. 在 GitBook Space 設置中找到 "Integrations"
2. 連接 GitHub
3. 選擇倉庫：`DungeonDelvers/dungeon-delvers-whitepaper`
4. 設置分支：`main`
5. 設置根目錄：`/gitbook-zh`

**方法二：手動導入**
1. 將 `gitbook-zh` 文件夾內容複製到 GitBook
2. 保持文件結構不變
3. 確保 `SUMMARY.md` 正確加載

### 4. 自定義域名（可選）

如果您想使用自定義域名：
1. 在 GitBook Space 設置中找到 "Domains"
2. 添加域名：`docs-zh.soulboundsaga.com`
3. 按照指示配置 DNS CNAME 記錄
4. 等待 DNS 生效（通常 1-24 小時）

## 📁 文件結構說明

```
gitbook-zh/
├── README.md                 # 首頁
├── SUMMARY.md               # 目錄結構
├── .gitbook.yaml            # GitBook 配置
├── quickstart/              # 快速開始
│   ├── getting-started.md   # 開始指南
│   └── top-10-tips.md      # 新手提示
├── gameplay/                # 遊戲玩法
│   └── hero-system.md      # 英雄系統
├── economy/                 # 經濟系統
├── tutorial/               # 教程
└── assets/                 # 圖片資源
```

## 🎨 品牌設置

在 GitBook 中設置品牌元素：

1. **Logo**
   - 上傳 Soulbound Saga logo
   - 建議尺寸：200x50px

2. **顏色主題**
   ```
   主色：#667eea
   次色：#764ba2
   強調色：#f093fb
   ```

3. **字體**
   - 標題：Noto Sans TC Bold
   - 正文：Noto Sans TC Regular

## 📝 內容維護

### 更新流程

1. **本地編輯**
   ```bash
   # 克隆倉庫
   git clone https://github.com/DungeonDelvers/dungeon-delvers-whitepaper.git
   
   # 進入中文文檔目錄
   cd dungeon-delvers-whitepaper/gitbook-zh
   
   # 編輯文件
   # ...
   
   # 提交更改
   git add .
   git commit -m "更新遊戲指南"
   git push
   ```

2. **GitBook 自動同步**
   - 如果設置了 GitHub 集成，更改會自動同步
   - 通常 1-2 分鐘內生效

### 添加新頁面

1. 創建新的 Markdown 文件
2. 在 `SUMMARY.md` 中添加鏈接
3. 確保路徑正確
4. 提交到 GitHub

### 圖片管理

1. 將圖片放在 `assets/` 文件夾
2. 使用相對路徑引用：`![描述](../assets/image.png)`
3. 建議圖片格式：PNG 或 WebP
4. 優化圖片大小（< 500KB）

## 🔧 高級配置

### SEO 優化

在每個頁面添加描述：
```markdown
---
description: 本頁面介紹 Soulbound Saga 的英雄系統...
---
```

### 多語言支持

預留英文版鏈接：
```markdown
[English Version](https://docs.soulboundsaga.com/) | **中文版**
```

### 分析追踪

1. 在 GitBook 設置中添加 Google Analytics
2. 追踪用戶行為和熱門內容
3. 根據數據優化文檔結構

## 📊 發布檢查清單

發布前確保：

- [ ] 所有鏈接正常工作
- [ ] 圖片正確顯示
- [ ] 目錄結構清晰
- [ ] 沒有拼寫錯誤
- [ ] 移動端顯示正常
- [ ] 搜索功能正常

## 🚨 常見問題

**Q: GitBook 同步失敗？**
- 檢查 GitHub 權限
- 確認分支名稱正確
- 查看 GitBook 同步日誌

**Q: 圖片不顯示？**
- 檢查路徑是否正確
- 確認圖片已上傳到倉庫
- 使用相對路徑而非絕對路徑

**Q: 自定義域名不生效？**
- 檢查 DNS 設置
- 等待 DNS 傳播（最多 48 小時）
- 確認 SSL 證書已頒發

## 📞 需要幫助？

- GitBook 官方文檔：[docs.gitbook.com](https://docs.gitbook.com/)
- 社群支持：[Telegram 群組](https://t.me/Soulbound_Saga)
- 技術問題：在 GitHub 提 issue

---

祝您文檔發布順利！🎉