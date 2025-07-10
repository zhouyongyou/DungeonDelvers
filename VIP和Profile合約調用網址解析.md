# 🎯 VIP 和 Profile 合約調用網址解析

## 🤔 您問的問題

**"智能合約假設是VIP或玩家檔案的話互動的網址是？"**

答案很有趣：**VIP 和 Profile 合約有兩種不同的實現方式**！

## 🔄 兩種實現方式

### 方式 1：使用 baseURI + Metadata Server

**當前的合約實現**（`VIPStaking.sol` 和 `PlayerProfile.sol`）：

```solidity
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    _requireOwned(tokenId);
    require(bytes(baseURI).length > 0, "Contract: baseURI not set");
    return string(abi.encodePacked(baseURI, tokenId.toString()));
}
```

**調用的網址**：
```
http://localhost:3001/api/vip/123        # VIP NFT #123
http://localhost:3001/api/profile/456   # Profile NFT #456
```

**前提條件**：
- 管理員必須設定 `baseURI`：
  ```javascript
  await vipContract.setBaseURI("http://localhost:3001/api/vip/");
  await profileContract.setBaseURI("http://localhost:3001/api/profile/");
  ```

### 方式 2：使用 SVG 函式庫 (鏈上生成)

**可選的 SVG 函式庫實現**（`VIPSVGLibrary.sol` 和 `ProfileSVGLibrary.sol`）：

```solidity
// 如果使用 SVG 函式庫版本
function tokenURI(uint256 tokenId) public view override returns (string memory) {
    // 從鏈上數據生成
    VIPCardData memory data = VIPCardData({
        tokenId: tokenId,
        level: getVipLevel(ownerOf(tokenId)),
        stakedValueUSD: stakedValueUSD,
        // ... 其他數據
    });
    return VIPSVGLibrary.buildTokenURI(data);
}
```

**調用的網址**：
```
沒有外部網址！直接返回 base64 編碼的 JSON
"data:application/json;base64,eyJuYW1lIjoi..."
```

## 🔍 檢查當前使用的是哪種方式

### 方法 1：檢查合約的 tokenURI 實現

```javascript
// 檢查 VIP 合約
const vipTokenURI = await vipContract.tokenURI(1);
console.log("VIP tokenURI:", vipTokenURI);

// 檢查 Profile 合約
const profileTokenURI = await profileContract.tokenURI(1);
console.log("Profile tokenURI:", profileTokenURI);
```

**可能的結果**：

1. **如果返回 HTTP URL**：
   ```
   "http://localhost:3001/api/vip/1"
   ```
   → 使用方式 1（需要 Metadata Server）

2. **如果返回 base64 JSON**：
   ```
   "data:application/json;base64,eyJuYW1lIjoi..."
   ```
   → 使用方式 2（SVG 函式庫）

3. **如果拋出錯誤**：
   ```
   Error: "Contract: baseURI not set"
   ```
   → 使用方式 1，但尚未設定 baseURI

### 方法 2：檢查 baseURI 設定

```javascript
// 檢查當前的 baseURI 設定
const vipBaseURI = await vipContract.baseURI();
const profileBaseURI = await profileContract.baseURI();

console.log("VIP baseURI:", vipBaseURI);
console.log("Profile baseURI:", profileBaseURI);
```

## 🌐 實際的調用網址（根據設定）

### 如果使用 Metadata Server（方式 1）

**設定好的情況下**：
```
VIP NFT:     http://localhost:3001/api/vip/:tokenId
Profile NFT: http://localhost:3001/api/profile/:tokenId
```

**調用流程**：
```mermaid
graph TD
    A[前端調用 vipContract.tokenURI(123)] --> B[合約返回 baseURI + tokenId]
    B --> C["http://localhost:3001/api/vip/123"]
    C --> D[Metadata Server 處理]
    D --> E[返回動態生成的 JSON 元數據]
    E --> F[前端顯示 VIP NFT]
```

### 如果使用 SVG 函式庫（方式 2）

**調用流程**：
```mermaid
graph TD
    A[前端調用 vipContract.tokenURI(123)] --> B[合約讀取鏈上數據]
    B --> C[調用 VIPSVGLibrary.buildTokenURI()]
    C --> D[函式庫生成動態 SVG]
    D --> E[返回 base64 編碼的 JSON]
    E --> F[前端直接解析並顯示]
```

## 🛠️ Metadata Server 的 VIP 和 Profile 端點實現

在 `dungeon-delvers-metadata-server/src/index.js` 中：

### VIP 端點
```javascript
app.get('/api/vip/:tokenId', handleRequest(async (req, res) => {
    const { tokenId } = req.params;
    
    // 1. 從智能合約獲取 owner
    const owner = await publicClient.readContract({
        address: contractAddresses.vipStaking,
        abi: abis.vipStaking,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
    });

    // 2. 從 The Graph 查詢 VIP 數據
    const { player } = await graphClient.request(GET_VIP_QUERY, { 
        playerId: owner.toLowerCase() 
    });

    // 3. 從智能合約獲取實時 VIP 等級
    const vipLevel = await publicClient.readContract({
        address: contractAddresses.vipStaking,
        abi: abis.vipStaking,
        functionName: 'getVipLevel',
        args: [owner]
    });

    // 4. 生成動態 SVG 並返回元數據
    const svgString = generateVipSVG({ level: Number(vipLevel), stakedValueUSD }, BigInt(tokenId));
    const metadata = {
        name: `Dungeon Delvers VIP #${tokenId}`,
        description: "A soul-bound VIP card that provides in-game bonuses based on the staked value.",
        image: `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`,
        attributes: [
            { trait_type: "Level", value: Number(vipLevel) },
            { trait_type: "Staked Value (USD)", value: Number(formatEther(stakedValueUSD)) },
        ],
    };
    
    res.json(metadata);
}));
```

### Profile 端點
```javascript
app.get('/api/profile/:tokenId', handleRequest(async (req, res) => {
    const { tokenId } = req.params;
    
    // 1. 從智能合約獲取 owner
    const owner = await publicClient.readContract({
        address: contractAddresses.playerProfile,
        abi: abis.playerProfile,
        functionName: 'ownerOf',
        args: [BigInt(tokenId)],
    });

    // 2. 從 The Graph 查詢玩家檔案數據
    const { player } = await graphClient.request(GET_PLAYER_PROFILE_QUERY, { 
        playerId: owner.toLowerCase() 
    });

    // 3. 生成動態 SVG 並返回元數據
    const svgString = generateProfileSVG({ 
        level: Number(profile.level), 
        experience: BigInt(profile.experience) 
    }, BigInt(tokenId));
    
    const metadata = {
        name: `Dungeon Delvers Profile #${tokenId}`,
        description: "A soul-bound achievement token for Dungeon Delvers.",
        image: `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`,
        attributes: [
            { trait_type: "Level", value: Number(profile.level) },
            { trait_type: "Experience", value: Number(profile.experience) },
        ],
    };
    
    res.json(metadata);
}));
```

## 🚀 確認您的項目使用哪種方式

### 快速檢查腳本

```javascript
// 在瀏覽器控制台或 Node.js 中運行
async function checkContractImplementation() {
    try {
        // 假設您有 VIP NFT #1
        const tokenURI = await vipContract.tokenURI(1);
        
        if (tokenURI.startsWith('http://')) {
            console.log('✅ 使用方式 1: Metadata Server');
            console.log('調用網址:', tokenURI);
        } else if (tokenURI.startsWith('data:application/json;base64,')) {
            console.log('✅ 使用方式 2: SVG 函式庫');
            console.log('直接生成 base64 JSON');
        }
    } catch (error) {
        if (error.message.includes('baseURI not set')) {
            console.log('⚠️ 使用方式 1，但 baseURI 尚未設定');
            console.log('需要設定: await vipContract.setBaseURI("http://localhost:3001/api/vip/")');
        } else {
            console.error('❌ 檢查失敗:', error.message);
        }
    }
}

checkContractImplementation();
```

## 📋 總結

**回答您的問題**：

1. **如果使用 Metadata Server 模式**：
   - VIP: `http://localhost:3001/api/vip/:tokenId`
   - Profile: `http://localhost:3001/api/profile/:tokenId`

2. **如果使用 SVG 函式庫模式**：
   - **沒有外部網址**，直接在鏈上生成

3. **要確定使用哪種模式**：
   - 檢查 `tokenURI()` 的返回值
   - 檢查 `baseURI()` 的設定值

您的項目很可能使用的是**第一種模式**，需要設定 baseURI 才能正常工作！