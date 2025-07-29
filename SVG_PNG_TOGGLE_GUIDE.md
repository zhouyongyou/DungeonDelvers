# SVG/PNG 切換功能指南

## 功能概述

DungeonDelvers 現在支持用戶在 SVG 和 PNG 兩種 NFT 顯示格式之間切換。這個功能讓用戶可以根據自己的偏好選擇顯示模式。

## 功能特點

### 1. 全局切換
- 一鍵切換所有 NFT 的顯示模式
- 偏好設置自動保存到瀏覽器本地存儲
- 下次訪問時會記住用戶的選擇

### 2. 切換按鈕位置
- **我的資產頁面** - 在頁面標題下方，標籤欄上方
- **市場頁面** - 在頁面右上角的操作按鈕區域

### 3. 顯示模式
- **SVG 模式（默認）**
  - 向量圖形，無限縮放不失真
  - 文件較小，載入快速
  - 動態生成，可顯示實時數據

- **PNG 模式**
  - 點陣圖片，兼容性更好
  - 適合需要分享或保存圖片的場景
  - 使用 NFT metadata 中的原始圖片

## 技術實現

### 核心組件

1. **useNftDisplayPreference Hook**
   ```typescript
   const { displayMode, toggleDisplayMode } = useNftDisplay();
   ```

2. **NftDisplayProvider Context**
   - 提供全局狀態管理
   - 已添加到 App.tsx 中

3. **NftSvgDisplay 組件**
   - 自動檢測顯示模式
   - 支持 PNG 圖片載入失敗時回退到 SVG

4. **切換按鈕組件**
   - `NftDisplayToggle` - 完整按鈕
   - `NftDisplayToggleMini` - 迷你圖標版本
   - `NftDisplaySwitch` - 開關樣式

## 使用範例

### 在組件中使用切換功能
```tsx
import { useNftDisplay } from '../hooks/useNftDisplayPreference';
import { NftDisplayToggleMini } from '../components/ui/NftDisplayToggle';

function MyComponent() {
  const { displayMode, toggleDisplayMode } = useNftDisplay();
  
  return (
    <div>
      <NftDisplayToggleMini />
      <p>當前模式: {displayMode === 'svg' ? 'SVG' : 'PNG'}</p>
    </div>
  );
}
```

### 強制特定顯示模式
```tsx
<NftSvgDisplay 
  nft={myNft} 
  forceMode="png"  // 強制使用 PNG，忽略用戶偏好
/>
```

## 注意事項

1. **PNG 圖片可用性**
   - 並非所有 NFT 都有 PNG 圖片
   - 如果 PNG 不可用，會自動回退到 SVG

2. **性能考慮**
   - SVG 動態生成，適合顯示實時數據
   - PNG 需要額外的網絡請求

3. **瀏覽器兼容性**
   - 偏好設置依賴 localStorage
   - 隱私模式下可能無法保存設置

## 擴展建議

1. **添加更多顯示選項**
   - WebP 格式支持
   - 動畫 GIF 支持

2. **優化圖片載入**
   - 實現圖片預載入
   - 添加載入進度指示器

3. **用戶體驗增強**
   - 添加切換動畫效果
   - 提供預覽功能

## 開發者提示

- 所有顯示 NFT 的頁面都應該導入並使用 `NftSvgDisplay` 組件
- 確保 NFT 數據包含有效的 `image` 字段用於 PNG 顯示
- 在需要的頁面添加切換按鈕，提供一致的用戶體驗

---

功能已完整實現並整合到系統中！用戶現在可以自由切換 NFT 的顯示格式了。