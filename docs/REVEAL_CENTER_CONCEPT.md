# 📋 揭示中心（Reveal Center）概念文檔

> 創建日期：2025-08-05
> 
> 本文檔記錄了 `AllPendingReveals` 組件的原始設計理念，以及使用 `UniversalRevealStatus` 重新實現的改進方案。

## 🎯 原始概念

`AllPendingReveals` 組件的設計初衷是提供一個**集中式的揭示管理中心**，讓用戶能在一個地方查看和管理所有待揭示的操作。

### 設計優點
- 📊 **統一視圖** - 用戶無需在不同頁面間切換
- 🎯 **集中管理** - 方便追蹤所有待處理操作
- 📋 **教育功能** - 統一說明揭示機制規則

### 原始實現問題
- ❌ 依賴 3 個獨立的舊組件（RevealStatus、AltarRevealStatus、DungeonRevealStatus）
- ❌ 沒有被整合到主導航系統
- ❌ 維護成本高，需要同時維護 4 個組件
- ❌ UI/UX 不一致，每個組件有自己的樣式

## 💡 改進方案

使用統一的 `UniversalRevealStatus` 組件重新實現揭示中心的概念。

### 實現示例

```tsx
import React from 'react';
import { useAccount } from 'wagmi';
import { UniversalRevealStatus } from '../components/reveal/UniversalRevealStatus';

export const RevealCenterPage: React.FC = () => {
  const { address } = useAccount();

  if (!address) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            🔒 請連接錢包
          </h2>
          <p className="text-gray-400">
            需要連接錢包才能查看待揭示的操作
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
        {/* 標題區 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <span className="text-3xl">🎲</span>
            揭示中心
          </h1>
          <p className="text-gray-400">
            所有待揭示的操作都會顯示在這裡。請在時限內完成揭示。
          </p>
        </div>

        {/* 揭示狀態網格 */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* NFT 鑄造區 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
              <span>⚔️</span> NFT 鑄造
            </h2>
            <UniversalRevealStatus 
              revealType="mint" 
              contractType="hero" 
              userAddress={address} 
            />
            <UniversalRevealStatus 
              revealType="mint" 
              contractType="relic" 
              userAddress={address} 
            />
          </div>

          {/* 祭壇升級區 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
              <span>⚗️</span> 祭壇升級
            </h2>
            <UniversalRevealStatus 
              revealType="altar" 
              userAddress={address} 
            />
          </div>

          {/* 地下城探險區 */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
              <span>🗺️</span> 地下城探險
            </h2>
            <UniversalRevealStatus 
              revealType="dungeon" 
              userAddress={address} 
            />
          </div>
        </div>

        {/* 機制說明 */}
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-400 mb-3">
            💡 揭示機制說明
          </h3>
          <div className="grid gap-2 text-xs text-blue-300 md:grid-cols-2">
            <div>
              <h4 className="font-semibold mb-1">⏱️ 時間規則</h4>
              <ul className="space-y-1 pl-4 list-disc">
                <li>提交後等待 3 個區塊（約 2.25 秒）</li>
                <li>必須在 255 個區塊內完成（約 3.2 分鐘）</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">⚠️ 注意事項</h4>
              <ul className="space-y-1 pl-4 list-disc">
                <li>過期未揭示將自動失敗或獲得最低結果</li>
                <li>任何人都可以幫助強制揭示過期操作</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 路由整合

如果要添加到主導航，需要在 `App.tsx` 中添加：

```tsx
// 添加到頁面列表
const basePages: Page[] = [
  'dashboard', 'profile', 'myAssets', 'marketplace', 
  'mint', 'altar', 'dungeon', 'vip', 'referral', 
  'gameData', 'admin', 'pitch', 'revealCenter' // 新增
];

// 添加路由處理
case 'revealCenter': return <RevealCenterPage />;
```

## 🏗️ 架構優勢

### 1. **組件複用**
- 使用統一的 `UniversalRevealStatus` 組件
- 確保 UI/UX 一致性
- 降低維護成本

### 2. **靈活配置**
- 可以根據需求調整布局
- 支援響應式設計
- 易於添加新的揭示類型

### 3. **更好的用戶體驗**
- 統一的視覺風格
- 一致的交互模式
- 清晰的狀態提示

## 📊 使用場景

1. **活躍玩家** - 同時進行多種操作的用戶
2. **新手教學** - 了解揭示機制的統一入口
3. **批量管理** - 需要追蹤多個待揭示操作

## 🚀 未來擴展

1. **通知系統** - 當有操作即將過期時發送提醒
2. **批量操作** - 一鍵揭示所有可揭示的操作
3. **歷史記錄** - 查看過去的揭示記錄
4. **統計數據** - 顯示揭示成功率等統計信息

## 📝 實施建議

如果決定實施揭示中心：

1. **評估需求** - 確認用戶是否需要這個功能
2. **設計優先** - 先設計 UI/UX，確保良好體驗
3. **漸進實施** - 可以先作為實驗性功能
4. **收集反饋** - 根據用戶反饋持續優化

## 🗂️ 相關文件

- `/src/components/reveal/UniversalRevealStatus.tsx` - 統一揭示組件
- `/src/components/reveal/AllPendingReveals.tsx` - 原始實現（已封存）
- `/src/hooks/useCommitReveal.ts` - 鑄造揭示 Hook
- `/src/hooks/useAltarReveal.ts` - 祭壇揭示 Hook
- `/src/hooks/useDungeonReveal.ts` - 地下城揭示 Hook

---

*本文檔記錄了揭示中心的設計理念和改進方案，供未來開發參考。*