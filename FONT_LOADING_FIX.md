# 字體加載問題解決方案

## 問題描述
Google Fonts 加載失敗，特別是：
- Noto Serif TC (繁體中文襯線字體)
- Noto Sans TC (繁體中文無襯線字體)

錯誤訊息：`net::ERR_CONNECTION_CLOSED`

## 解決方案

### 方案 1：移除 Google Fonts（推薦）

如果不需要這些中文字體，可以直接移除：

```html
<!-- 刪除 index.html 中的這些行 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@400;700&display=swap" rel="stylesheet">
```

### 方案 2：使用系統字體

更新 CSS 使用系統內建的中文字體：

```css
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft JhengHei", 
               "微軟正黑體", "Apple LiGothic Medium", "蘋方", sans-serif;
}
```

### 方案 3：本地託管字體

1. 下載需要的字體文件
2. 將字體文件放入 `public/fonts/` 目錄
3. 使用 @font-face 引入：

```css
@font-face {
  font-family: 'Noto Sans TC';
  src: url('/fonts/NotoSansTC-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

### 方案 4：使用 CDN 備份

如果 Google Fonts 不穩定，可以使用其他 CDN：

```html
<!-- 使用 jsDelivr 作為備份 -->
<link href="https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-tc@5.0.0/index.css" rel="stylesheet">
```

### 方案 5：條件加載

只在需要時加載字體：

```javascript
// 動態加載字體
if (navigator.language.includes('zh')) {
  const link = document.createElement('link');
  link.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap';
  link.rel = 'stylesheet';
  document.head.appendChild(link);
}
```

## 臨時解決方法

如果只是想快速解決錯誤，可以：

1. **清除瀏覽器快取**
2. **使用 VPN** 如果 Google Fonts 被封鎖
3. **忽略錯誤** - 這些字體載入失敗不會影響功能，只影響中文顯示效果

## 建議

對於 DungeonDelvers 這種遊戲應用，建議：
1. 移除不必要的中文字體，使用系統默認字體
2. 只保留英文字體（如 Cinzel），這些檔案較小
3. 考慮使用 Web Font Loader 來優雅處理字體載入失敗的情況

## 性能優化

```html
<!-- 優化字體載入 -->
<link rel="preload" as="font" type="font/woff2" crossorigin 
      href="https://fonts.gstatic.com/s/cinzel/v23/8vIU7ww63mVu7gtR-kwKxNvkNOjw-tbnTYrvDE5ZdqU.woff2">
```

這樣可以減少字體載入對首屏渲染的影響。