# 儀表板 The Graph 載入失敗分析報告

## 問題描述
儀表板頁面顯示錯誤訊息："儀表板載入失敗 無法從 The Graph 獲取數據，請檢查 API 端點或稍後再試。"

## 根本原因分析

### 1. 程式碼層面分析
基於 `src/pages/DashboardPage.tsx` 的程式碼：

```typescript
// 第 164 行：錯誤檢查
const { stats, isLoading: isLoadingStats, isError: isGraphError } = useDashboardStats();

// 第 229 行：錯誤顯示
if (isGraphError) {
    return <div className="card-bg p-10 rounded-xl text-center text-red-400">
        <h3 className="text-xl font-bold">儀表板載入失敗</h3>
        <p className="mt-2">無法從 The Graph 獲取數據，請檢查 API 端點或稍後再試。</p>
    </div>;
}
```

### 2. 當前配置問題
`useDashboardStats` Hook 的配置（第 50-73 行）：

```typescript
const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboardStats', address, chainId],
    queryFn: async () => {
        // GraphQL 查詢邏輯
    },
    enabled: !!address && chainId === bsc.id && !!THE_GRAPH_API_URL,
    staleTime: 1000 * 60, // 60 秒
    // ❌ 缺少以下配置：
    // - retry: 重試次數
    // - timeout: 超時時間
    // - retryDelay: 重試延遲
});
```

## 當前等待時間分析

### React Query 預設行為
- **重試次數**：3 次
- **重試延遲**：指數退避 (1秒 → 2秒 → 4秒)
- **總等待時間**：約 7-15 秒
- **超時時間**：無限制（直到網路層超時）

### 實際等待時間計算
1. **首次請求**：網路超時（通常 30-60 秒）
2. **第一次重試**：等待 1 秒 + 網路超時
3. **第二次重試**：等待 2 秒 + 網路超時
4. **第三次重試**：等待 4 秒 + 網路超時

**最壞情況總時間**：約 4-6 分鐘

## 解決方案

### 1. 立即優化 - 添加超時和重試配置

```typescript
const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboardStats', address, chainId],
    queryFn: async () => {
        if (!address || !THE_GRAPH_API_URL) return null;
        
        // 添加超時控制
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超時
        
        try {
            const response = await fetch(THE_GRAPH_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: GET_DASHBOARD_STATS_QUERY,
                    variables: { owner: address.toLowerCase() },
                }),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) throw new Error('Network response was not ok');
            const { data, errors } = await response.json();
            
            if (errors) {
                throw new Error(`GraphQL errors: ${errors.map(e => e.message).join(', ')}`);
            }
            
            return data.player;
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('請求超時，請稍後再試');
            }
            throw error;
        }
    },
    enabled: !!address && chainId === bsc.id && !!THE_GRAPH_API_URL,
    staleTime: 1000 * 60, // 60 秒
    retry: 2, // 減少重試次數
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // 最大5秒延遲
});
```

### 2. 優化後的等待時間
- **首次請求**：10 秒超時
- **第一次重試**：等待 1 秒 + 10 秒超時
- **第二次重試**：等待 2 秒 + 10 秒超時

**優化後總時間**：約 33 秒

### 3. 用戶體驗改進

#### 方案 A：漸進式載入
```typescript
// 在錯誤狀態下顯示重試按鈕
if (isGraphError) {
    return (
        <div className="card-bg p-10 rounded-xl text-center text-red-400">
            <h3 className="text-xl font-bold">儀表板載入失敗</h3>
            <p className="mt-2">無法從 The Graph 獲取數據</p>
            <button 
                onClick={() => refetch()} 
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                重試載入
            </button>
            <p className="mt-2 text-sm text-gray-500">
                通常需要等待 30-60 秒，請稍後再試
            </p>
        </div>
    );
}
```

#### 方案 B：降級顯示
```typescript
// 在 GraphQL 失敗時顯示基本功能
if (isGraphError) {
    return (
        <section className="space-y-8">
            <div className="card-bg p-6 rounded-xl text-center">
                <h3 className="text-xl font-bold text-yellow-400">資料同步中</h3>
                <p className="mt-2 text-gray-400">
                    The Graph 數據載入中，部分功能暫時不可用
                </p>
                <p className="mt-1 text-sm text-gray-500">
                    預計等待時間：30-60 秒
                </p>
            </div>
            
            {/* 顯示基本功能，如錢包連接、快捷操作等 */}
            <div>
                <h3 className="section-title">快捷操作</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <QuickActionButton title="鑄造 NFT" description="獲取新的英雄與聖物" onAction={() => setActivePage('mint')} icon={<Icons.Mint className="w-8 h-8"/>} />
                    <QuickActionButton title="升星祭壇" description="提升你的 NFT 星級" onAction={() => setActivePage('altar')} icon={<Icons.Altar className="w-8 h-8"/>}/>
                    <QuickActionButton title="資產管理" description="創建隊伍、查看資產" onAction={() => setActivePage('party')} icon={<Icons.Assets className="w-8 h-8"/>}/>
                    <QuickActionButton title="前往地下城" description="開始你的冒險" onAction={() => setActivePage('dungeon')} icon={<Icons.Dungeon className="w-8 h-8"/>}/>
                </div>
            </div>
        </section>
    );
}
```

## 答案總結

### Q: 得等多久呢？
**目前配置**：4-6 分鐘（最壞情況）
**建議優化後**：30-60 秒

### Q: 是不是有一部分從 GRAPH 讀取不到頁面就會失敗？
**是的**，儀表板完全依賴 The Graph 數據：
- 玩家等級
- NFT 數量統計
- VIP 狀態
- 金庫餘額

**建議**：實作降級機制，在 The Graph 不可用時仍能提供基本功能。

## 緊急處理建議

1. **短期**：添加重試按鈕，讓用戶手動重試
2. **中期**：優化超時和重試配置
3. **長期**：實作混合數據源（The Graph + 直接合約調用）

## 相關檔案
- `src/pages/DashboardPage.tsx`：主要問題檔案
- `src/api/nfts.ts`：已有較好的錯誤處理可參考
- `src/apolloClient.ts`：Apollo Client 配置