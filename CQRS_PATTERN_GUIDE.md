# CQRS (Command Query Responsibility Segregation) 模式實踐指南

## 什麼是 CQRS？

CQRS 是一種架構模式，將系統的讀取（Query）和寫入（Command）操作分離到不同的模型中。

### 傳統模式 vs CQRS

**傳統模式**：
```
用戶 → 應用程式 → 單一模型 → 資料庫
```

**CQRS 模式**：
```
寫入：用戶 → Command → 寫入模型 → 資料庫
讀取：用戶 → Query → 讀取模型 → 投影資料
```

## DungeonDelvers 中的 CQRS 實現

### 現狀分析

DungeonDelvers 已經部分實現了 CQRS：
- **Command 端**：智能合約處理所有寫入操作
- **Query 端**：The Graph 提供讀取介面
- **分離點**：區塊鏈事件

### 架構圖

```
┌─────────────┐     Commands      ┌──────────────┐     Events      ┌─────────────┐
│   前端應用   │ ───────────────> │  智能合約     │ ─────────────> │  區塊鏈     │
│  (React)    │                   │ (Command端)   │                 │  (事件日誌)  │
└─────────────┘                   └──────────────┘                 └─────────────┘
       ↑                                                                    │
       │                                                                    │ 索引
       │ Queries                                                           ↓
       │                          ┌──────────────┐                 ┌─────────────┐
       └──────────────────────── │  GraphQL API  │ <────────────  │  The Graph  │
                                 │  (Query端)     │                │  (Subgraph)  │
                                 └──────────────┘                 └─────────────┘
```

## 實際應用範例

### 1. 領取獎勵流程

**Command 端（寫入）**：
```typescript
// 前端發送命令
const claimRewardsCommand = {
  type: 'CLAIM_REWARDS',
  partyId: 12345,
  timestamp: Date.now()
};

// 執行合約調用
await dungeonMasterContract.claimRewards(partyId);
```

**智能合約處理**：
```solidity
function claimRewards(uint256 _partyId) external {
    // 業務邏輯驗證
    require(unclaimedRewards > 0, "No rewards");
    
    // 狀態變更
    party.unclaimedRewards = 0;
    
    // 發出事件（重要！這是 CQRS 的關鍵）
    emit RewardsBanked(msg.sender, _partyId, amount);
}
```

**Query 端（讀取）**：
```graphql
query GetPartyRewards($partyId: ID!) {
  party(id: $partyId) {
    unclaimedRewards
    totalRewardsClaimed
    lastClaimTimestamp
  }
}
```

### 2. 完整的 CQRS 實現範例

```typescript
// services/CommandService.ts
export class CommandService {
  async executeCommand(command: Command): Promise<TransactionHash> {
    switch (command.type) {
      case 'START_EXPEDITION':
        return this.startExpedition(command);
      case 'CLAIM_REWARDS':
        return this.claimRewards(command);
      case 'CREATE_PARTY':
        return this.createParty(command);
      // ... 其他命令
    }
  }
  
  private async startExpedition(command: StartExpeditionCommand) {
    // 驗證命令
    this.validateCommand(command);
    
    // 執行合約調用
    const tx = await contract.requestExpedition(
      command.partyId,
      command.dungeonId,
      { value: command.fee }
    );
    
    // 記錄命令執行
    this.logCommand(command, tx.hash);
    
    return tx.hash;
  }
}

// services/QueryService.ts
export class QueryService {
  private apolloClient: ApolloClient;
  
  async getPartyStatus(partyId: string): Promise<PartyStatus> {
    const { data } = await this.apolloClient.query({
      query: GET_PARTY_STATUS,
      variables: { partyId }
    });
    
    return this.mapToPartyStatus(data.party);
  }
  
  async getExpeditionHistory(partyId: string): Promise<Expedition[]> {
    const { data } = await this.apolloClient.query({
      query: GET_EXPEDITION_HISTORY,
      variables: { partyId }
    });
    
    return data.expeditions;
  }
}
```

### 3. 使用 React Hook 封裝 CQRS

```typescript
// hooks/useCQRS.ts
export function useCQRS() {
  const commandService = new CommandService();
  const queryService = new QueryService();
  
  const execute = async (command: Command) => {
    // 執行命令
    const txHash = await commandService.executeCommand(command);
    
    // 等待交易確認
    await waitForTransaction(txHash);
    
    // 觸發查詢端更新
    queryClient.invalidateQueries(['party', command.partyId]);
  };
  
  const query = (queryType: string, variables: any) => {
    return queryService[queryType](variables);
  };
  
  return { execute, query };
}

// 使用範例
function PartyManager() {
  const { execute, query } = useCQRS();
  const [party, setParty] = useState(null);
  
  const handleClaimRewards = async () => {
    await execute({
      type: 'CLAIM_REWARDS',
      partyId: party.id
    });
    
    // 更新本地狀態
    const updatedParty = await query('getPartyStatus', party.id);
    setParty(updatedParty);
  };
}
```

## CQRS 的優勢

### 1. 性能優化
- 讀寫分離，可以針對性優化
- 查詢端可以使用預計算的投影
- 減少主鏈 RPC 調用

### 2. 擴展性
- Command 和 Query 可以獨立擴展
- 容易添加新的查詢視圖
- 支援多種讀取模型

### 3. 開發體驗
- 清晰的職責分離
- 更容易測試
- 更好的錯誤處理

## 最佳實踐

### 1. 命令設計原則
```typescript
interface Command {
  id: string;           // 唯一標識，用於冪等性
  type: string;         // 命令類型
  timestamp: number;    // 時間戳
  userId: string;       // 執行者
  payload: any;         // 命令數據
}
```

### 2. 查詢優化
```typescript
// 使用 DataLoader 批量查詢
const partyLoader = new DataLoader(async (partyIds) => {
  const parties = await queryService.getPartiesByIds(partyIds);
  return partyIds.map(id => parties.find(p => p.id === id));
});

// 使用快取策略
const { data } = useQuery({
  queryKey: ['party', partyId],
  queryFn: () => queryService.getPartyStatus(partyId),
  staleTime: 1000 * 60 * 5, // 5分鐘
  cacheTime: 1000 * 60 * 30, // 30分鐘
});
```

### 3. 事件驅動更新
```typescript
// 監聽區塊鏈事件，自動更新查詢端
useWatchContractEvent({
  eventName: 'RewardsBanked',
  onLogs(logs) {
    logs.forEach((log) => {
      // 使查詢快取失效
      queryClient.invalidateQueries(['party', log.args.partyId]);
    });
  },
});
```

## 進階概念

### 1. 事件溯源整合
CQRS 與 Event Sourcing 是天然的搭配：
- Commands 產生 Events
- Events 重建 Read Model
- 支援時間旅行和審計

### 2. SAGA 模式
處理跨合約的複雜流程：
```typescript
class ExpeditionSaga {
  async handle(command: StartExpeditionCommand) {
    // 步驟 1：檢查隊伍狀態
    const party = await this.queryPartyStatus(command.partyId);
    
    // 步驟 2：扣除費用
    await this.deductFee(command.userId, command.fee);
    
    // 步驟 3：開始遠征
    await this.startExpedition(command);
    
    // 步驟 4：更新統計
    await this.updateStatistics(command.userId);
  }
}
```

### 3. 最終一致性
- Command 執行後，Query 端可能有延遲
- 使用樂觀更新改善用戶體驗
- 提供載入狀態和重試機制

## 實施建議

### 第一階段：規範化現有程式碼
1. 將所有合約調用封裝為 Commands
2. 統一使用 GraphQL 進行查詢
3. 建立清晰的服務層

### 第二階段：優化查詢端
1. 實現複雜的 GraphQL 查詢
2. 添加快取和批量查詢
3. 優化 Subgraph 索引

### 第三階段：高級功能
1. 實現 Command 日誌和審計
2. 支援離線命令隊列
3. 實現複雜的 SAGA 流程

## 總結

CQRS 模式在 DungeonDelvers 中的應用：
- **現狀**：已有基礎架構（合約 + Subgraph）
- **機會**：可以進一步規範化和優化
- **價值**：提升性能、改善開發體驗、支援複雜功能

通過 CQRS，我們可以構建一個高性能、可擴展、易維護的 Web3 遊戲架構。