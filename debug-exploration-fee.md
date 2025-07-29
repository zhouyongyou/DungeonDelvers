# explorationFee 調試指南

## 合約資訊
- **合約名稱**: DungeonMaster
- **合約地址**: `0xf7143B7644219e896D2013Fc01bc9e9e006C6Dca`
- **網路**: BSC Mainnet
- **函數**: `explorationFee()`

## 調試步驟

### 1. BSCScan 調試
訪問: https://bscscan.com/address/0xf7143B7644219e896D2013Fc01bc9e9e006C6Dca#readContract

檢查項目：
- [ ] 合約是否已驗證
- [ ] explorationFee() 是否能正常調用
- [ ] paused() 狀態（如果存在）
- [ ] owner() 地址

### 2. 瀏覽器控制台調試
```javascript
// 方法 1: 使用 window.ethereum
const callData = {
  to: '0xf7143B7644219e896D2013Fc01bc9e9e006C6Dca',
  data: '0x965c84f4' // explorationFee() selector
};

window.ethereum.request({
  method: 'eth_call',
  params: [callData, 'latest']
}).then(result => {
  console.log('Success:', result);
  // 解碼結果 (uint256)
  if (result !== '0x') {
    const value = BigInt(result);
    console.log('explorationFee:', value.toString());
  }
}).catch(error => {
  console.error('Error:', error);
});
```

### 3. 使用 Cast (Foundry) 調試
```bash
# 安裝 Foundry (如果還沒安裝)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 調用 explorationFee
cast call 0xf7143B7644219e896D2013Fc01bc9e9e006C6Dca "explorationFee()" --rpc-url https://bsc-dataseed.binance.org/

# 檢查合約 owner
cast call 0xf7143B7644219e896D2013Fc01bc9e9e006C6Dca "owner()" --rpc-url https://bsc-dataseed.binance.org/

# 檢查是否 paused
cast call 0xf7143B7644219e896D2013Fc01bc9e9e006C6Dca "paused()" --rpc-url https://bsc-dataseed.binance.org/
```

### 4. 錯誤分析
錯誤碼: `0x7e273289` 帶參數 `0x01`

可能的檢查點：
1. 合約是否需要初始化
2. 是否有特殊的訪問控制
3. 合約版本是否正確

### 5. 臨時解決方案
如果確認是合約問題，可以在前端暫時跳過：

```typescript
// 在 AdminPage.tsx 中過濾掉 explorationFee
const safeParameterConfig = parameterConfig.filter(
  p => p.key !== 'explorationFee'
);
```

## 需要記錄的資訊
1. BSCScan 上的錯誤訊息（截圖）
2. 瀏覽器控制台的完整錯誤訊息
3. 合約部署時間和最後更新時間
4. 是否有其他函數也無法調用