# WebSocket 訂閱 Subgraph 實現指南

## 概述

The Graph 支援通過 WebSocket 進行 GraphQL 訂閱（Subscriptions），允許前端應用即時接收資料更新。

## 現有架構

目前 DungeonDelvers 使用輪詢方式更新資料：
```typescript
// 每 10 秒查詢一次
refetchInterval: 10000
```

## WebSocket 訂閱優勢

1. **即時性**：資料變更立即推送
2. **效率**：減少不必要的網路請求
3. **體驗**：更流暢的用戶體驗

## 實現步驟

### 1. 安裝依賴

```bash
npm install @apollo/client graphql-ws
```

### 2. 配置 Apollo Client 支援訂閱

```typescript
// config/apolloClient.ts
import { ApolloClient, InMemoryCache, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { HttpLink } from '@apollo/client/link/http';

// HTTP 連接用於查詢和變更
const httpLink = new HttpLink({
  uri: 'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.7'
});

// WebSocket 連接用於訂閱
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'wss://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.0.7',
    connectionParams: {
      // 認證參數（如果需要）
    },
    // 重連邏輯
    shouldRetry: () => true,
    retryAttempts: 5,
    retryWait: async (retries) => {
      await new Promise(resolve => setTimeout(resolve, Math.min(1000 * 2 ** retries, 30000)));
    },
  })
);

// 根據操作類型分割連接
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache()
});
```

### 3. 定義訂閱查詢

```typescript
// graphql/subscriptions.ts
import { gql } from '@apollo/client';

// 訂閱隊伍狀態變更
export const PARTY_STATUS_SUBSCRIPTION = gql`
  subscription OnPartyStatusChange($partyId: ID!) {
    party(id: $partyId) {
      id
      unclaimedRewards
      cooldownEndsAt
      provisionsRemaining
      lastUpdatedAt
    }
  }
`;

// 訂閱玩家的所有遠征結果
export const PLAYER_EXPEDITIONS_SUBSCRIPTION = gql`
  subscription OnPlayerExpeditions($player: String!) {
    expeditions(
      where: { player: $player }
      orderBy: timestamp
      orderDirection: desc
      first: 1
    ) {
      id
      success
      reward
      expGained
      dungeonName
      timestamp
    }
  }
`;

// 訂閱獎勵領取事件
export const REWARDS_CLAIMED_SUBSCRIPTION = gql`
  subscription OnRewardsClaimed($player: String!) {
    rewardsClaimed(where: { player: $player }) {
      id
      partyId
      amount
      timestamp
    }
  }
`;
```

### 4. 創建訂閱 Hook

```typescript
// hooks/useRealtimePartyStatus.ts
import { useSubscription } from '@apollo/client';
import { PARTY_STATUS_SUBSCRIPTION } from '../graphql/subscriptions';

export function useRealtimePartyStatus(partyId: string) {
  const { data, loading, error } = useSubscription(
    PARTY_STATUS_SUBSCRIPTION,
    {
      variables: { partyId },
      // 錯誤處理
      onError: (err) => {
        console.error('Subscription error:', err);
      },
      // 收到資料時的回調
      onData: ({ data }) => {
        console.log('Received party update:', data);
      },
      // 訂閱配置
      shouldResubscribe: true,
      // 跳過條件
      skip: !partyId,
    }
  );

  return {
    party: data?.party,
    loading,
    error
  };
}
```

### 5. 整合到現有組件

```typescript
// components/PartyCard.tsx
import { useRealtimePartyStatus } from '../hooks/useRealtimePartyStatus';
import { useRewardManager } from '../hooks/useRewardManager';

export function PartyCard({ partyId }: { partyId: string }) {
  // 使用訂閱獲取即時資料
  const { party, loading } = useRealtimePartyStatus(partyId);
  const { claimRewards, isClaimPending } = useRewardManager({ 
    partyId: BigInt(partyId), 
    chainId: 56 
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="party-card">
      <h3>隊伍 #{partyId}</h3>
      
      {/* 即時更新的未領取獎勵 */}
      {party?.unclaimedRewards > 0 && (
        <div className="rewards-section">
          <span>{formatEther(party.unclaimedRewards)} SOUL</span>
          <button onClick={claimRewards} disabled={isClaimPending}>
            領取獎勵
          </button>
        </div>
      )}
      
      {/* 即時更新的冷卻狀態 */}
      {party?.cooldownEndsAt > Date.now() / 1000 && (
        <CooldownTimer endsAt={party.cooldownEndsAt} />
      )}
    </div>
  );
}
```

### 6. 處理連接狀態

```typescript
// hooks/useSubscriptionStatus.ts
import { useEffect, useState } from 'react';

export function useSubscriptionStatus(client: ApolloClient) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    const wsClient = (client.link as any).options.uri;
    
    // 監聽連接狀態
    wsClient.on('connected', () => setStatus('connected'));
    wsClient.on('closed', () => setStatus('disconnected'));
    wsClient.on('error', () => setStatus('disconnected'));

    return () => {
      // 清理監聽器
    };
  }, [client]);

  return status;
}

// 在 UI 中顯示連接狀態
function ConnectionIndicator() {
  const status = useSubscriptionStatus(apolloClient);
  
  return (
    <div className={`connection-indicator ${status}`}>
      {status === 'connected' && '🟢 即時更新已連接'}
      {status === 'connecting' && '🟡 正在連接...'}
      {status === 'disconnected' && '🔴 連接已斷開'}
    </div>
  );
}
```

## 注意事項

### 1. The Graph 訂閱限制

- **並發連接數**：每個 API key 有限制
- **訂閱數量**：每個連接的訂閱數有上限
- **資料更新頻率**：取決於區塊確認速度

### 2. 降級策略

```typescript
// hooks/useHybridQuery.ts
export function useHybridQuery(query, subscription, variables) {
  // 嘗試使用訂閱
  const { data: subData, error: subError } = useSubscription(subscription, {
    variables,
    skip: !supportsWebSocket()
  });
  
  // 降級到輪詢
  const { data: queryData } = useQuery(query, {
    variables,
    skip: !!subData && !subError,
    pollInterval: subError ? 10000 : 0
  });
  
  return subData || queryData;
}
```

### 3. 效能優化

```typescript
// 批量訂閱多個隊伍
const BATCH_PARTY_SUBSCRIPTION = gql`
  subscription OnPartiesUpdate($partyIds: [ID!]!) {
    parties(where: { id_in: $partyIds }) {
      id
      unclaimedRewards
      cooldownEndsAt
      lastUpdatedAt
    }
  }
`;

// 使用片段減少資料傳輸
const PARTY_FRAGMENT = gql`
  fragment PartyEssentials on Party {
    id
    unclaimedRewards
    cooldownEndsAt
  }
`;
```

## 實際應用場景

### 1. 遠征完成通知

```typescript
function ExpeditionNotifier({ userId }: { userId: string }) {
  useSubscription(PLAYER_EXPEDITIONS_SUBSCRIPTION, {
    variables: { player: userId },
    onData: ({ data }) => {
      const expedition = data?.expeditions?.[0];
      if (expedition) {
        // 顯示通知
        showNotification({
          title: expedition.success ? '遠征成功！' : '遠征失敗',
          message: `獲得 ${formatEther(expedition.reward)} SOUL`,
          type: expedition.success ? 'success' : 'error'
        });
      }
    }
  });
  
  return null;
}
```

### 2. 多人協作場景

```typescript
// 即時顯示其他玩家的行動
const DUNGEON_ACTIVITY_SUBSCRIPTION = gql`
  subscription OnDungeonActivity($dungeonId: ID!) {
    expeditions(
      where: { dungeonId: $dungeonId }
      orderBy: timestamp
      orderDirection: desc
      first: 10
    ) {
      id
      player
      partyPower
      success
      timestamp
    }
  }
`;
```

## 測試策略

```typescript
// 模擬 WebSocket 訂閱進行測試
import { MockedProvider } from '@apollo/client/testing';

const mocks = [
  {
    request: {
      query: PARTY_STATUS_SUBSCRIPTION,
      variables: { partyId: '1' }
    },
    result: {
      data: {
        party: {
          id: '1',
          unclaimedRewards: '1000000000000000000',
          cooldownEndsAt: '0',
          lastUpdatedAt: '1234567890'
        }
      }
    }
  }
];

test('實時更新隊伍狀態', async () => {
  render(
    <MockedProvider mocks={mocks}>
      <PartyCard partyId="1" />
    </MockedProvider>
  );
  
  // 驗證資料更新
  await waitFor(() => {
    expect(screen.getByText('1.0 SOUL')).toBeInTheDocument();
  });
});
```

## 部署考量

1. **WebSocket 支援**：確保託管環境支援 WebSocket
2. **負載均衡**：WebSocket 連接需要 sticky sessions
3. **監控**：追蹤連接數和訂閱效能

## 總結

WebSocket 訂閱可以顯著提升 DungeonDelvers 的用戶體驗：
- 即時更新遊戲狀態
- 減少網路流量
- 支援多人互動功能

建議從關鍵功能開始實施，如獎勵領取和遠征結果，然後逐步擴展到其他功能。