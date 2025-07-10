# NFT 合约部署故障排查指南

## 问题描述
在设置 Hero NFT 合约的 Collection URI 时遇到错误：`execution reverted: 0x`

## 可能的原因和解决方案

### 1. 权限问题 (最常见)
**问题**: 调用者不是合约的 owner
**解决方案**:
```javascript
// 检查当前部署账户是否是合约的 owner
const currentOwner = await heroContract.owner();
const deployerAddress = await signer.getAddress();
console.log("合约 Owner:", currentOwner);
console.log("部署者地址:", deployerAddress);

if (currentOwner.toLowerCase() !== deployerAddress.toLowerCase()) {
    console.log("❌ 权限不足：部署者不是合约的 owner");
    // 需要使用正确的 owner 账户或转移所有权
}
```

### 2. 合约地址问题
**问题**: 使用了错误的合约地址
**解决方案**:
```javascript
// 验证合约地址是否正确
const code = await ethers.provider.getCode(heroContractAddress);
if (code === "0x") {
    console.log("❌ 合约地址无效或合约未部署");
}
```

### 3. 网络配置问题
**问题**: 连接到错误的网络或 RPC 问题
**解决方案**:
```javascript
// 检查网络配置
const network = await ethers.provider.getNetwork();
console.log("当前网络:", network.name, network.chainId);

// 确保连接到正确的网络
// 对于 BSC testnet: chainId 97
// 对于 BSC mainnet: chainId 56
```

### 4. Gas 配置问题
**问题**: Gas limit 或 gas price 设置不当
**解决方案**:
```javascript
// 手动设置 gas 参数
const tx = await heroContract.setContractURI(contractURI, {
    gasLimit: 500000,  // 增加 gas limit
    gasPrice: ethers.parseUnits('10', 'gwei')  // 设置合适的 gas price
});
```

### 5. 合约状态问题
**问题**: 合约被暂停或处于异常状态
**解决方案**:
```javascript
// 检查合约是否被暂停
try {
    const isPaused = await heroContract.paused();
    console.log("合约是否暂停:", isPaused);
} catch (error) {
    console.log("无法检查暂停状态，可能合约没有 paused 函数");
}
```

## 调试步骤

### 步骤 1: 详细错误信息
修改部署脚本，添加更详细的错误处理：

```javascript
try {
    console.log("正在为 Hero 设定 Collection URI...");
    
    // 检查权限
    const owner = await heroContract.owner();
    const signer = await heroContract.signer.getAddress();
    console.log("合约 Owner:", owner);
    console.log("当前签名者:", signer);
    
    // 估算 gas
    const gasEstimate = await heroContract.setContractURI.estimateGas(contractURI);
    console.log("预估 Gas:", gasEstimate.toString());
    
    // 执行交易
    const tx = await heroContract.setContractURI(contractURI, {
        gasLimit: gasEstimate * 2n,  // 使用两倍的预估 gas
    });
    
    console.log("交易已提交，Hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("交易确认，状态:", receipt.status);
    
} catch (error) {
    console.error("详细错误信息:", error);
    
    // 检查是否是权限错误
    if (error.message.includes("Ownable: caller is not the owner")) {
        console.log("❌ 权限错误：调用者不是合约的 owner");
    }
    
    // 检查是否是 gas 错误
    if (error.message.includes("out of gas")) {
        console.log("❌ Gas 不足，尝试增加 gas limit");
    }
}
```

### 步骤 2: 使用 Hardhat Console
如果你有 Hardhat 环境，可以使用控制台进行调试：

```bash
# 进入 Hardhat 控制台
npx hardhat console --network <your-network>

# 在控制台中测试
const Hero = await ethers.getContractFactory("Hero");
const hero = await Hero.attach("YOUR_HERO_CONTRACT_ADDRESS");
await hero.owner();  // 检查 owner
await hero.setContractURI("YOUR_URI");  // 测试调用
```

### 步骤 3: 检查交易详情
在区块链浏览器中查看失败的交易：
1. 复制交易哈希
2. 在 BscScan (BSC) 或相应的区块链浏览器中查看
3. 查看 "Internal Transactions" 和 "Logs" 部分

## 临时解决方案

如果问题持续存在，可以尝试：

1. **分步部署**: 先部署合约，然后在单独的脚本中设置 URI
2. **使用不同的 RPC**: 切换到不同的 RPC 节点
3. **增加延迟**: 在合约部署和设置 URI 之间增加延迟

```javascript
// 部署后等待几个区块
await new Promise(resolve => setTimeout(resolve, 10000));  // 等待 10 秒

// 或者等待特定数量的确认
await tx.wait(3);  // 等待 3 个区块确认
```

## 联系信息

如果以上方法都无法解决问题，请提供以下信息：
- 完整的错误堆栈
- 使用的网络 (testnet/mainnet)
- 合约地址
- 部署者地址
- 交易哈希（如果有）

这些信息将帮助进一步诊断问题。