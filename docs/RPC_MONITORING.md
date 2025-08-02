# RPC 監控系統

## 系統概述
全面的 RPC 請求監控和統計系統，用於追踪、分析和優化 DungeonDelvers 應用的 RPC 使用情況。

## 核心組件
- **rpcMonitor**: 核心監控器，追踪所有 RPC 請求
- **rpcAnalytics**: 分析工具，生成統計報告和建議
- **rpcOptimizer**: 自動優化建議系統
- **RpcDashboard**: 用戶儀表板組件
- **RpcMonitoringPanel**: 管理員監控面板

## 使用方法

### 1. 監控的 Hook
```typescript
import { useMonitoredReadContract, useMonitoredReadContracts } from '../hooks/useMonitoredContract';

// 替代標準的 useReadContract
const { data, isLoading } = useMonitoredReadContract({
  address: contractAddress,
  abi: contractAbi,
  functionName: 'balanceOf',
  args: [address],
  contractName: 'ERC20',
  functionName: 'balanceOf'
});
```

### 2. 獲取統計數據
```typescript
import { useRpcMonitoring } from '../hooks/useRpcMonitoring';

const { stats, insights, clearStats, exportStats } = useRpcMonitoring();
```

### 3. 查看監控面板
- 用戶：使用 `<RpcDashboard />` 組件
- 管理員：在 AdminPage 中的 RPC 監控面板

## 優化建議
系統會自動分析 RPC 使用情況並提供優化建議：
- 緩存策略優化
- 重試機制調整
- 批量請求合併
- 超時設置優化

## 性能指標
- 總請求數
- 成功率和錯誤率
- 平均響應時間
- 按合約/頁面的使用統計
- 實時性能洞察

## 配置建議
基於監控數據，系統會自動生成：
- React Query 緩存配置
- 請求重試策略
- 批量請求設置