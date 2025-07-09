# 實時更新優化方案

## 問題分析
用戶反映組隊後需要等待較長時間才能看到更新，體驗不佳。

## 解決方案

### 1. 交易監聽與自動刷新
```typescript
// src/hooks/useTransactionWatcher.ts
import { useEffect } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';

export const useTransactionWatcher = (
  transactionHash?: string,
  onSuccess?: () => void
) => {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!transactionHash || !publicClient) return;

    const watchTransaction = async () => {
      try {
        // 等待交易確認
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: transactionHash as `0x${string}`,
          confirmations: 1
        });

        if (receipt.status === 'success') {
          // 刷新相關查詢
          queryClient.invalidateQueries({ 
            queryKey: ['ownedNfts', address] 
          });
          queryClient.invalidateQueries({ 
            queryKey: ['playerParties', address] 
          });
          
          onSuccess?.();
        }
      } catch (error) {
        console.error('Transaction monitoring failed:', error);
      }
    };

    watchTransaction();
  }, [transactionHash, publicClient, queryClient, address, onSuccess]);
};
```

### 2. 樂觀更新 (Optimistic Updates)
```typescript
// 在創建隊伍時立即更新UI
const handleCreatePartyOptimistic = async (heroIds: bigint[], relicIds: bigint[]) => {
    // 1. 樂觀更新 - 立即在UI中顯示新隊伍
    const tempParty = {
        id: BigInt(Date.now()), // 臨時ID
        name: `隊伍 #${Date.now()}`,
        totalPower: selectedHeroes.reduce((acc, id) => {
            const hero = heroes.find(h => h.id === id);
            return acc + (hero?.power || 0);
        }, 0),
        totalCapacity: selectedRelics.reduce((acc, id) => {
            const relic = relics.find(r => r.id === id);
            return acc + (relic?.capacity || 0);
        }, 0),
        heroIds,
        relicIds,
        status: 'creating' // 創建中狀態
    };

    // 更新 React Query 緩存
    queryClient.setQueryData(['ownedNfts', address, chainId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
            ...oldData,
            parties: [...oldData.parties, tempParty]
        };
    });

    try {
        // 2. 發送真實交易
        const hash = await writeContractAsync({
            ...partyContract,
            functionName: 'createParty',
            args: [heroIds, relicIds],
            value: fee,
        });

        // 3. 監聽交易完成
        useTransactionWatcher(hash, () => {
            // 交易成功後移除臨時數據，刷新真實數據
            queryClient.invalidateQueries(['ownedNfts', address, chainId]);
        });

    } catch (error) {
        // 4. 交易失敗時回滾樂觀更新
        queryClient.setQueryData(['ownedNfts', address, chainId], (oldData: any) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                parties: oldData.parties.filter((p: any) => p.id !== tempParty.id)
            };
        });
        throw error;
    }
};
```

### 3. 輪詢機制
```typescript
// src/hooks/usePolling.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export const usePolling = (
  queryKey: string[],
  intervalMs: number = 5000,
  enabled: boolean = true
) => {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey });
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryKey, intervalMs, enabled, queryClient]);

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  return { stopPolling };
};
```

### 4. WebSocket 實時通知 (進階方案)
```typescript
// src/hooks/useWebSocketUpdates.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAccount } from 'wagmi';

export const useWebSocketUpdates = () => {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!address) return;

    // 連接WebSocket服務
    const ws = new WebSocket(`wss://your-websocket-server.com/updates/${address}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'PARTY_CREATED':
          queryClient.invalidateQueries(['ownedNfts', address]);
          break;
        case 'EXPEDITION_COMPLETED':
          queryClient.invalidateQueries(['playerParties', address]);
          break;
        default:
          break;
      }
    };

    return () => {
      ws.close();
    };
  }, [address, queryClient]);
};
```

## 實施步驟

### 階段一：基礎優化 (立即實施)
1. 實施交易監聽自動刷新
2. 添加樂觀更新機制
3. 優化 React Query 緩存策略

### 階段二：進階優化 (中期)
1. 實施智能輪詢機制
2. 添加用戶反饋提示
3. 優化錯誤處理和重試

### 階段三：完整方案 (長期)
1. 建立WebSocket服務
2. 實時事件推送
3. 離線狀態處理

## 用戶體驗改進

### 立即反饋
- 交易發送後立即顯示"創建中"狀態
- 進度條顯示交易處理進度
- 成功後自動刷新並顯示成功消息

### 狀態管理
```typescript
const [creationStatus, setCreationStatus] = useState<{
  status: 'idle' | 'creating' | 'confirming' | 'success' | 'error';
  message?: string;
}>({ status: 'idle' });
```

### UI優化
```jsx
{creationStatus.status === 'creating' && (
  <div className="bg-blue-900/50 p-4 rounded-lg">
    <div className="flex items-center gap-3">
      <LoadingSpinner size="h-5 w-5" />
      <span>正在創建隊伍...</span>
    </div>
  </div>
)}

{creationStatus.status === 'confirming' && (
  <div className="bg-yellow-900/50 p-4 rounded-lg">
    <div className="flex items-center gap-3">
      <LoadingSpinner size="h-5 w-5" />
      <span>等待區塊鏈確認...</span>
    </div>
  </div>
)}
```