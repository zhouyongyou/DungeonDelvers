# 字體載入優化方案

## 當前配置

保留了 Google Fonts 以獲得最佳視覺效果：
- **Noto Sans TC** - 用於一般文字顯示
- **Noto Serif TC** - 用於特殊標題或強調文字

## 優化字體載入的建議

### 1. 添加 font-display: swap
讓文字立即顯示，字體載入後再切換：

```html
<link href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;700&family=Noto+Sans+TC:wght@400;700&display=swap" rel="stylesheet">
```

### 2. 優化字體子集
只載入需要的字符集：

```html
<!-- 只載入常用中文字符 -->
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;700&display=swap&subset=chinese-traditional" rel="stylesheet">
```

### 3. 使用資源提示
添加 dns-prefetch 提高解析速度：

```html
<link rel="dns-prefetch" href="//fonts.googleapis.com">
<link rel="dns-prefetch" href="//fonts.gstatic.com">
```

### 4. 監控載入狀態
使用 Font Face Observer 處理載入失敗：

```javascript
// 偵測字體載入狀態
if ('fonts' in document) {
  document.fonts.ready.then(() => {
    document.body.classList.add('fonts-loaded');
  });
}
```

### 5. CSS 優雅降級
```css
/* 字體載入前使用相似的系統字體 */
body {
  font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif;
  font-synthesis: weight style;
}

/* 字體載入後的微調 */
.fonts-loaded body {
  letter-spacing: 0.02em;
}
```

## 處理載入錯誤

如果字體載入失敗不影響功能，可以：

1. **忽略錯誤** - 系統會自動使用備用字體
2. **使用 Service Worker** 快取字體文件
3. **考慮自託管** 如果 Google Fonts 經常不穩定

## 性能監控

```javascript
// 監控字體載入時間
const fontLoadTime = performance.getEntriesByType('resource')
  .filter(entry => entry.name.includes('fonts.googleapis.com'))
  .reduce((total, entry) => total + entry.duration, 0);

console.log(`字體載入總時間: ${fontLoadTime}ms`);
```

## 結論

保留 Google Fonts 能提供更好的視覺體驗。載入錯誤通常是暫時性的網絡問題，不會影響應用功能。系統會自動使用備用字體確保內容可讀。