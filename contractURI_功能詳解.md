# contractURI 功能詳解

## 🎯 核心功能說明

### 1. `string private _contractURI;` - 合約級別元數據存儲

這是一個**私有狀態變數**，用來存儲指向合約級別元數據的URL。

#### 📝 具體作用：
- **存儲位置**: 合約存儲一個URL字符串
- **指向內容**: 這個URL指向描述整個NFT Collection的JSON文件
- **訪問方式**: 通過 `contractURI()` 函數對外提供訪問

#### 🔗 實際存儲內容示例：
```solidity
// Hero合約中存儲的內容
_contractURI = "https://www.dungeondelvers.xyz/metadata/hero-collection.json"
```

### 2. `event ContractURIUpdated(string newContractURI);` - 更新事件

這是一個**事件（Event）**，用來記錄合約URI的更新操作。

#### 📝 具體作用：
- **透明化**: 記錄每次URI更新操作
- **可追溯**: 區塊鏈上永久記錄所有變更
- **通知機制**: 前端應用可以監聽此事件來更新UI

## 🎨 實際應用效果

### OpenSea 如何使用這些信息：

#### 1. **讀取過程**：
```
1. OpenSea 調用 → heroContract.contractURI()
2. 合約返回 → "https://www.dungeondelvers.xyz/metadata/hero-collection.json"
3. OpenSea 獲取 → 該URL的JSON內容
4. OpenSea 解析 → Collection品牌信息
```

#### 2. **JSON文件內容**：
```json
{
  "name": "Dungeon Delvers Heroes",
  "description": "Heroes are the core combat power...",
  "image": "https://www.dungeondelvers.xyz/assets/images/collections/hero-logo.png",
  "external_link": "https://www.dungeondelvers.xyz",
  "seller_fee_basis_points": 500,
  "fee_recipient": "0x10925A7138649C7E1794CE646182eeb5BF8ba647"
}
```

#### 3. **OpenSea 顯示效果**：
```
🏆 Collection Name: "Dungeon Delvers Heroes"
📝 Description: "Heroes are the core combat power..."
🖼️ Logo: [顯示hero-logo.png]
🔗 Website: dungeondelvers.xyz
💰 Creator earnings: 5% (500 basis points)
```

## 🔧 技術實現細節

### contractURI() 函數：
```solidity
function contractURI() public view returns (string memory) {
    return _contractURI;  // 返回存儲的URL
}
```

### setContractURI() 函數：
```solidity
function setContractURI(string memory newContractURI) external onlyOwner {
    _contractURI = newContractURI;  // 更新URL
    emit ContractURIUpdated(newContractURI);  // 發出事件通知
}
```

### 事件監聽示例：
```javascript
// 前端監聽合約URI更新
heroContract.on('ContractURIUpdated', (newURI) => {
    console.log('Collection URI updated:', newURI);
    // 更新前端顯示的Collection信息
    updateCollectionInfo(newURI);
});
```

## 🆚 與 tokenURI 的區別

| 功能 | contractURI | tokenURI |
|------|-------------|----------|
| **作用對象** | 整個Collection | 單個NFT |
| **存儲內容** | Collection品牌信息 | 個別NFT屬性 |
| **調用方式** | `contractURI()` | `tokenURI(tokenId)` |
| **更新頻率** | 很少更新 | 可能動態更新 |
| **使用場景** | 市場Collection頁面 | 個別NFT詳情頁面 |

## 🎯 實際應用場景

### 1. **NFT市場展示**
```
用戶訪問OpenSea → 查看"Dungeon Delvers Heroes"Collection
↓
OpenSea調用contractURI() → 獲取Collection元數據
↓
顯示專業的Collection頁面（名稱、描述、LOGO、版稅）
```

### 2. **品牌管理**
```solidity
// 項目升級時更新Collection描述
heroContract.setContractURI("https://www.dungeondelvers.xyz/metadata/hero-collection-v2.json");
// 事件自動記錄: ContractURIUpdated("https://www.dungeondelvers.xyz/metadata/hero-collection-v2.json")
```

### 3. **版稅設置**
```json
{
  "seller_fee_basis_points": 500,  // 5%版稅
  "fee_recipient": "0x10925A7138649C7E1794CE646182eeb5BF8ba647"  // 版稅接收地址
}
```

## 🔐 安全性考慮

### 1. **訪問控制**
```solidity
function setContractURI(string memory newContractURI) external onlyOwner {
    // 只有合約owner可以修改
}
```

### 2. **透明性**
```solidity
emit ContractURIUpdated(newContractURI);
// 所有更新都在區塊鏈上記錄，無法隱藏
```

### 3. **不可變性**
```solidity
string private _contractURI;
// 存儲在合約中，除非owner主動更改否則不會變化
```

## 🚀 實際效益

### 對項目的好處：

1. **專業形象** 🏆
   - Collection有統一的品牌展示
   - 用戶看到完整的項目信息

2. **自動版稅** 💰
   - 無需手動設置，自動收取5%版稅
   - 減少營運成本

3. **SEO優化** 📈
   - 提供官方網站連結
   - 增加品牌曝光度

4. **用戶信任** 🤝
   - 透明的項目信息
   - 專業的展示效果

## 📊 總結

**`_contractURI`** 就像是給您的NFT Collection一張**專業名片**：
- 存儲Collection的品牌信息
- 讓NFT市場知道如何專業展示您的項目
- 自動處理版稅和品牌展示

**`ContractURIUpdated`** 事件則像是**更新通知**：
- 記錄每次品牌信息的更新
- 保證透明度和可追溯性
- 讓前端應用能即時響應變化

這兩個功能共同作用，讓您的NFT項目在市場上呈現出**專業、可信、統一**的品牌形象！🎨