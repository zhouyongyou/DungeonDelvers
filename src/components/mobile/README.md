# 手機版優化組件使用指南

這個目錄包含了專門為手機版優化的 React 組件，提供更好的觸控體驗和視覺效果。

## 組件列表

### 1. MobileAddress - 地址顯示組件
用於在手機上優雅地顯示錢包地址，支持複製功能。

```tsx
import { MobileAddress, MobileAddressWithPreview } from './mobile/MobileAddress';

// 基本使用
<MobileAddress address="0x1234..." />

// 長按顯示完整地址
<MobileAddressWithPreview address="0x1234..." />
```

### 2. MobileDataCard - 數據卡片組件
替代表格在手機上顯示數據的卡片式佈局。

```tsx
import { MobileDataCard, MobileDataCardGroup } from './mobile/MobileDataCard';

// 單個卡片
<MobileDataCard
  title="用戶統計"
  data={[
    { label: '總戰力', value: '15,238', highlight: true },
    { label: '英雄數量', value: '12' }
  ]}
  actions={<button>查看詳情</button>}
/>

// 橫向滾動卡片組
<MobileDataCardGroup cards={[...]} />
```

### 3. MobileActionMenu - 操作選單組件
將多個按鈕整合為下拉選單，節省空間。

```tsx
import { MobileActionMenu, MobileActionBar } from './mobile/MobileActionMenu';

// 下拉選單
<MobileActionMenu
  actions={[
    { id: 'edit', label: '編輯', icon: Icons.Edit, onClick: () => {} },
    { id: 'delete', label: '刪除', variant: 'danger', onClick: () => {} }
  ]}
/>

// 底部固定操作欄
<MobileActionBar
  primaryAction={{ label: '確認', onClick: () => {} }}
  secondaryActions={[...]}
/>
```

### 4. MobileStatsCard - 統計卡片組件
顯示帶趨勢的統計數據。

```tsx
import { MobileStatsCard } from './mobile/MobileStatsCard';

<MobileStatsCard
  title="收益統計"
  stats={[
    { 
      label: '日收益', 
      value: '1,234 SOUL', 
      trend: { value: '+12.5%', direction: 'up' }
    }
  ]}
/>
```

### 5. MobileTabs - 標籤導航組件
手機優化的標籤導航，支持橫向滾動。

```tsx
import { MobileTabs, MobileBottomTabs } from './mobile/MobileTabs';

// 頂部標籤
<MobileTabs
  tabs={[
    { id: 'overview', label: '總覽', icon: Icons.Home },
    { id: 'heroes', label: '英雄', badge: 12 }
  ]}
  activeTab="overview"
  onTabChange={(id) => setActiveTab(id)}
  variant="pill" // 'default' | 'pill' | 'underline'
/>

// 底部固定標籤欄
<MobileBottomTabs tabs={[...]} />
```

## 使用 Hooks

### useMobileOptimization
檢測設備類型和提供響應式功能。

```tsx
import { useMobileOptimization } from '../../hooks/useMobileOptimization';

const Component = () => {
  const { isMobile, isTouch, screenSize } = useMobileOptimization();
  
  return (
    <div>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </div>
  );
};
```

### useBreakpoint
檢測當前斷點。

```tsx
import { useBreakpoint } from '../../hooks/useMobileOptimization';

const { isMobileBreakpoint, isTabletBreakpoint } = useBreakpoint();
```

## 最佳實踐

### 1. 觸控目標大小
確保所有可點擊元素至少有 44x44px 的觸控區域：

```tsx
<button className="min-h-[44px] min-w-[44px] p-3">
  點擊我
</button>
```

### 2. 防止雙擊縮放
在關鍵互動區域添加：

```tsx
<div style={{ touchAction: 'manipulation' }}>
  {/* 內容 */}
</div>
```

### 3. 橫向滾動
使用負邊距技巧實現全寬滾動：

```tsx
<div className="overflow-x-auto -mx-4 px-4">
  <div className="flex space-x-3">
    {/* 滾動內容 */}
  </div>
</div>
```

### 4. 條件渲染
根據設備類型顯示不同內容：

```tsx
const { isMobile } = useMobileOptimization();

return (
  <>
    {/* 手機版 */}
    <div className="md:hidden">
      <MobileDataCard data={data} />
    </div>
    
    {/* 桌面版 */}
    <div className="hidden md:block">
      <table>{/* 表格內容 */}</table>
    </div>
  </>
);
```

## 性能優化

1. **懶加載圖片**：使用 `LazyImage` 組件
2. **虛擬滾動**：長列表使用 `react-window`
3. **防抖輸入**：搜索框使用 `useDebouncedValue`
4. **減少重渲染**：使用 `React.memo` 和 `useMemo`

## 示例頁面

查看完整示例：[MobileOptimizationExample.tsx](../../examples/MobileOptimizationExample.tsx)

## 注意事項

- 所有組件都支持自定義 `className` 和 `style`
- 顏色主題與項目整體保持一致
- 支持暗色模式（默認）
- 已考慮 iOS 和 Android 的差異