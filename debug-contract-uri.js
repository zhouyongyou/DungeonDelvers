// 调试 setContractURI 函数调用失败的脚本
// 使用方法: node debug-contract-uri.js

const { ethers } = require("hardhat");

async function main() {
    console.log("🔍 开始调试 setContractURI 函数调用...\n");
    
    // 配置参数 - 请根据你的实际情况修改
    const HERO_CONTRACT_ADDRESS = "YOUR_HERO_CONTRACT_ADDRESS_HERE";
    const CONTRACT_URI = "https://dungeondelvers.xyz/metadata/hero-collection.json";
    
    try {
        // 1. 检查网络连接
        console.log("📡 检查网络连接...");
        const network = await ethers.provider.getNetwork();
        console.log(`   网络名称: ${network.name}`);
        console.log(`   Chain ID: ${network.chainId}`);
        console.log(`   区块号: ${await ethers.provider.getBlockNumber()}\n`);
        
        // 2. 检查合约地址
        console.log("🏠 检查合约地址...");
        const code = await ethers.provider.getCode(HERO_CONTRACT_ADDRESS);
        if (code === "0x") {
            console.log("❌ 错误: 合约地址无效或合约未部署");
            return;
        }
        console.log("✅ 合约地址有效\n");
        
        // 3. 连接到合约
        console.log("🔗 连接到 Hero 合约...");
        const Hero = await ethers.getContractFactory("Hero");
        const heroContract = Hero.attach(HERO_CONTRACT_ADDRESS);
        
        // 4. 检查当前签名者
        console.log("👤 检查签名者信息...");
        const [signer] = await ethers.getSigners();
        const signerAddress = await signer.getAddress();
        const signerBalance = await ethers.provider.getBalance(signerAddress);
        console.log(`   签名者地址: ${signerAddress}`);
        console.log(`   签名者余额: ${ethers.formatEther(signerBalance)} ETH\n`);
        
        // 5. 检查合约所有者
        console.log("👑 检查合约所有者...");
        const contractOwner = await heroContract.owner();
        console.log(`   合约所有者: ${contractOwner}`);
        console.log(`   签名者地址: ${signerAddress}`);
        const isOwner = contractOwner.toLowerCase() === signerAddress.toLowerCase();
        console.log(`   是否为所有者: ${isOwner ? '✅ 是' : '❌ 否'}\n`);
        
        if (!isOwner) {
            console.log("❌ 错误: 当前签名者不是合约的所有者");
            console.log("   解决方案:");
            console.log("   1. 使用正确的所有者账户");
            console.log("   2. 或者转移合约所有权");
            return;
        }
        
        // 6. 检查合约状态
        console.log("🔍 检查合约状态...");
        try {
            const isPaused = await heroContract.paused();
            console.log(`   是否暂停: ${isPaused ? '❌ 是' : '✅ 否'}`);
            if (isPaused) {
                console.log("❌ 错误: 合约当前处于暂停状态");
                return;
            }
        } catch (error) {
            console.log("   无法检查暂停状态 (可能合约没有 paused 函数)");
        }
        
        // 7. 检查当前 contractURI
        console.log("\n📄 检查当前 contractURI...");
        try {
            const currentURI = await heroContract.contractURI();
            console.log(`   当前 URI: ${currentURI}`);
        } catch (error) {
            console.log("   无法获取当前 URI");
        }
        
        // 8. 估算 Gas
        console.log("\n⛽ 估算 Gas 费用...");
        try {
            const gasEstimate = await heroContract.setContractURI.estimateGas(CONTRACT_URI);
            console.log(`   预估 Gas: ${gasEstimate.toString()}`);
            
            // 计算费用
            const gasPrice = await ethers.provider.getGasPrice();
            const estimatedCost = gasEstimate * gasPrice;
            console.log(`   预估费用: ${ethers.formatEther(estimatedCost)} ETH`);
            
            // 检查余额是否足够
            if (signerBalance < estimatedCost) {
                console.log("❌ 错误: 签名者余额不足以支付 Gas 费用");
                return;
            }
            console.log("✅ 余额足够支付 Gas 费用");
            
        } catch (error) {
            console.log("❌ Gas 估算失败:");
            console.log(`   错误: ${error.message}`);
            
            // 常见错误解析
            if (error.message.includes("execution reverted")) {
                console.log("   这通常表示函数调用会失败");
            }
            if (error.message.includes("Ownable: caller is not the owner")) {
                console.log("   权限错误: 调用者不是合约所有者");
            }
            return;
        }
        
        // 9. 执行干运行 (如果 Gas 估算成功)
        console.log("\n🧪 执行干运行测试...");
        try {
            await heroContract.setContractURI.staticCall(CONTRACT_URI);
            console.log("✅ 干运行测试成功");
        } catch (error) {
            console.log("❌ 干运行测试失败:");
            console.log(`   错误: ${error.message}`);
            return;
        }
        
        // 10. 询问是否执行实际交易
        console.log("\n🚀 准备执行实际交易...");
        console.log("   如果你想执行实际交易，请取消注释下面的代码");
        console.log("   并重新运行脚本\n");
        
        /*
        // 实际执行交易 (取消注释以执行)
        console.log("📤 发送交易...");
        const tx = await heroContract.setContractURI(CONTRACT_URI, {
            gasLimit: gasEstimate * 2n,  // 使用两倍的预估 gas
        });
        
        console.log(`   交易哈希: ${tx.hash}`);
        console.log("   等待交易确认...");
        
        const receipt = await tx.wait();
        console.log(`   交易状态: ${receipt.status === 1 ? '✅ 成功' : '❌ 失败'}`);
        console.log(`   Gas 使用: ${receipt.gasUsed.toString()}`);
        */
        
        console.log("✅ 调试完成！");
        
    } catch (error) {
        console.error("❌ 调试过程中发生错误:");
        console.error(error);
    }
}

// 运行脚本
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});