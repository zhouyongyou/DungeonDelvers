# 🪝 React Hooks 規則指南

> 🚨 **重要提醒**：違反 React Hooks 規則會導致難以調試的運行時錯誤！

## 📋 目錄
- [核心規則](#核心規則)
- [常見錯誤模式](#常見錯誤模式)
- [正確實踐](#正確實踐)
- [實際修復案例](#實際修復案例)
- [檢查清單](#檢查清單)
- [除錯技巧](#除錯技巧)

## 核心規則

### 1. 只在最頂層調用 Hook
✅ **正確**：Hook 必須在組件或自定義 Hook 的最頂層調用
```typescript
function MyComponent() {
  // ✅ 好：在最頂層
  const [state, setState] = useState(0);
  const data = useQuery();
  
  if (condition) {
    // 邏輯處理
  }
  
  return <div>{state}</div>;
}
```

❌ **錯誤**：不要在條件、循環或嵌套函數中調用
```typescript
function MyComponent() {
  if (condition) {
    // ❌ 錯誤：在條件中
    const [state, setState] = useState(0);
  }
  
  for (let i = 0; i < items.length; i++) {
    // ❌ 錯誤：在循環中
    const data = useQuery();
  }
  
  function nested() {
    // ❌ 錯誤：在嵌套函數中
    const context = useContext(MyContext);
  }
}
```

### 2. 只在 React 函數中調用 Hook
✅ **正確場所**：
- React 函數組件
- 自定義 Hook（以 `use` 開頭的函數）

❌ **錯誤場所**：
- 普通 JavaScript 函數
- Class 組件
- 事件處理器

## 常見錯誤模式

### 1. 條件返回後調用 Hook
❌ **錯誤**：
```typescript
function MyComponent({ userId }) {
  if (!userId) {
    return <div>請登入</div>;
  }
  
  // ❌ Hook 在條件返回之後
  const [data, setData] = useState();
  const userInfo = useUserInfo(userId);
  
  return <div>{userInfo.name}</div>;
}
```

✅ **正確**：
```typescript
function MyComponent({ userId }) {
  // ✅ 所有 Hook 在最頂層
  const [data, setData] = useState();
  const userInfo = useUserInfo(userId, {
    enabled: !!userId  // 使用 enabled 控制執行
  });
  
  if (!userId) {
    return <div>請登入</div>;
  }
  
  return <div>{userInfo.name}</div>;
}
```

### 2. 條件性調用 Hook
❌ **錯誤**：
```typescript
function MyComponent({ type }) {
  let data;
  
  if (type === 'user') {
    // ❌ 條件性調用
    data = useUserData();
  } else if (type === 'admin') {
    // ❌ 條件性調用
    data = useAdminData();
  }
  
  return <div>{data}</div>;
}
```

✅ **正確**：
```typescript
function MyComponent({ type }) {
  // ✅ 無條件調用所有 Hook
  const userData = useUserData({
    enabled: type === 'user'
  });
  const adminData = useAdminData({
    enabled: type === 'admin'
  });
  
  const data = type === 'user' ? userData : adminData;
  
  return <div>{data}</div>;
}
```

### 3. try-catch 中的 Hook
❌ **錯誤**：
```typescript
function MyComponent() {
  try {
    // ❌ Hook 在 try 塊中
    const data = useQuery();
    return <div>{data}</div>;
  } catch (error) {
    return <div>Error</div>;
  }
}
```

✅ **正確**：
```typescript
function MyComponent() {
  // ✅ Hook 在 try-catch 外部
  const { data, error } = useQuery();
  
  if (error) {
    return <div>Error</div>;
  }
  
  return <div>{data}</div>;
}
```

## 正確實踐

### 1. 使用 enabled 選項
當需要條件性地執行 Hook 邏輯時，使用 `enabled` 選項：

```typescript
const { data } = useQuery({
  queryKey: ['user', userId],
  queryFn: fetchUser,
  enabled: !!userId  // 只在 userId 存在時執行
});
```

### 2. 提前返回的正確模式
```typescript
function MyComponent({ isAuthenticated }) {
  // 1. 調用所有 Hook
  const [state, setState] = useState();
  const data = useQuery();
  const { user } = useAuth();
  
  // 2. 然後進行條件檢查
  if (!isAuthenticated) {
    return <LoginPrompt />;
  }
  
  // 3. 主要渲染邏輯
  return <Dashboard data={data} />;
}
```

### 3. 自定義 Hook 的規則
```typescript
// ✅ 正確的自定義 Hook
function useCustomHook(id: string) {
  // Hook 在最頂層
  const [state, setState] = useState();
  const data = useQuery();
  
  // 邏輯處理
  useEffect(() => {
    if (id) {
      // 執行副作用
    }
  }, [id]);
  
  return { state, data };
}
```

## 實際修復案例

### 案例 1: MyAssetsPageEnhanced
**問題**：useState 在條件返回後調用
```typescript
// ❌ 之前
if (!address) return <LoadingState />;
const [isRefreshing, setIsRefreshing] = useState(false);

// ✅ 修復後
const [isRefreshing, setIsRefreshing] = useState(false);
if (!address) return <LoadingState />;
```

### 案例 2: TokenBalanceDisplay
**問題**：在條件判斷中調用 Hook
```typescript
// ❌ 之前
if (!tokenInfo) return null;
const { data: balance } = useReadContract({...});

// ✅ 修復後
const { data: balance } = useReadContract({
  address: tokenInfo?.address,
  abi: erc20Abi,
  functionName: 'balanceOf',
  query: {
    enabled: !!tokenInfo  // 使用 enabled 控制
  }
});

if (!tokenInfo) return null;
```

### 案例 3: useMonitoredContract
**問題**：Hook 在 try-catch 和條件塊中
```typescript
// ❌ 之前
if (hasValidConfig) {
  result = useReadContracts(config);
}

// ✅ 修復後
// 無條件調用，用 enabled 控制
const result = useReadContracts({
  ...config,
  query: {
    enabled: hasValidConfig
  }
});
```

## 檢查清單

開發時請確認：
- [ ] 所有 Hook 都在組件/自定義 Hook 的最頂層調用
- [ ] 沒有 Hook 在 if/else/switch 語句中
- [ ] 沒有 Hook 在循環中
- [ ] 沒有 Hook 在普通函數中（非組件/自定義 Hook）
- [ ] 沒有 Hook 在 try-catch 塊中
- [ ] 所有早期返回（early return）都在 Hook 調用之後
- [ ] 條件性邏輯使用 `enabled` 選項而非條件調用

## 除錯技巧

### 1. 識別錯誤
當看到以下錯誤時，表示違反了 Hook 規則：
```
React has detected a change in the order of Hooks
```

### 2. 使用 ESLint
安裝並配置 ESLint 規則：
```bash
npm install --save-dev eslint-plugin-react-hooks
```

`.eslintrc.js`:
```javascript
{
  "plugins": ["react-hooks"],
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 3. 快速檢查
使用以下命令檢查條件性 Hook 調用：
```bash
# 檢查所有條件性 Hook 錯誤
npm run lint 2>&1 | grep "React Hook.*is called conditionally"

# 計算錯誤數量
npm run lint 2>&1 | grep "React Hook.*is called conditionally" | wc -l
```

### 4. VS Code 設置
在 VS Code 中啟用即時檢查：
1. 安裝 ESLint 擴展
2. 在設置中啟用 `eslint.autoFixOnSave`

## 總結

記住 React Hooks 的兩個黃金規則：
1. **只在最頂層調用 Hook**
2. **只在 React 函數中調用 Hook**

遵循這些規則可以確保：
- Hook 的調用順序在每次渲染時保持一致
- React 能正確地將內部狀態與對應的 Hook 關聯
- 避免難以調試的運行時錯誤

當需要條件性行為時，優先使用：
- `enabled` 選項（用於 data fetching hooks）
- 在 Hook 內部使用條件邏輯
- 條件性渲染而非條件性調用 Hook