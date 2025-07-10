// 在你现有代码基础上的快速调试改进
// 直接替换你的 try-catch 块

// 原始的步骤 4 代码，但添加了更详细的调试信息
log("步驟 4: 設定所有 NFT 合約的 Collection 元數據 URI...");

const collectionMappings = {
    "Hero": "hero-collection.json",
    "Relic": "relic-collection.json",
    "Party": "party-collection.json",
    "VIPStaking": "vip-staking-collection.json",
    "PlayerProfile": "player-profile-collection.json"
};

for (const name of nftContracts) {
    const contractInstance = deployedContracts[name].instance;
    const contractAddress = deployedContracts[name].address;
    
    if (typeof contractInstance.setContractURI !== 'function') {
        logError(`❌ ${name} 合約中找不到 setContractURI 函式。請檢查您的合約代碼與 ABI。`);
        continue; 
    }
    
    try {
        const collectionFile = collectionMappings[name];
        const collectionURI = `${FRONTEND_BASE_URL}/metadata/${collectionFile}`;
        
        logInfo(`正在為 ${name} 設定 Collection URI 為: ${collectionURI}`);
        logInfo(`合約地址: ${contractAddress}`);
        
        // 【新增】检查权限
        try {
            const contractOwner = await contractInstance.owner();
            const currentSigner = await contractInstance.signer.getAddress();
            logInfo(`合約所有者: ${contractOwner}`);
            logInfo(`當前簽名者: ${currentSigner}`);
            
            if (contractOwner.toLowerCase() !== currentSigner.toLowerCase()) {
                logError(`❌ 權限錯誤: 當前簽名者不是 ${name} 合約的所有者`);
                continue;
            }
        } catch (ownerError) {
            logWarn(`⚠️  無法檢查 ${name} 合約的所有者: ${ownerError.message}`);
        }
        
        // 【新增】Gas 估算
        try {
            const gasEstimate = await contractInstance.setContractURI.estimateGas(collectionURI);
            logInfo(`預估 Gas: ${gasEstimate.toString()}`);
        } catch (gasError) {
            logError(`❌ ${name} Gas 估算失敗: ${gasError.message}`);
            if (gasError.message.includes("execution reverted")) {
                logError(`這通常表示函數調用會失敗`);
                if (gasError.message.includes("Ownable: caller is not the owner")) {
                    logError(`權限錯誤: 調用者不是合約所有者`);
                }
            }
            continue;
        }
        
        // 【新增】干运行测试
        try {
            await contractInstance.setContractURI.staticCall(collectionURI);
            logInfo(`✅ 乾運行測試成功`);
        } catch (staticError) {
            logError(`❌ ${name} 乾運行測試失敗: ${staticError.message}`);
            continue;
        }
        
        // 执行实际交易（改进版本）
        logInfo(`📤 發送交易...`);
        const tx = await contractInstance.setContractURI(collectionURI, {
            gasLimit: 500000,  // 【新增】明确设置 Gas limit
        });
        
        logInfo(`交易哈希: ${tx.hash}`);
        logInfo(`等待交易確認...`);
        
        const receipt = await tx.wait();
        
        if (receipt.status === 1) {
            logInfo(`✅ ${name} Collection URI 設定成功！`);
            logInfo(`Gas 使用: ${receipt.gasUsed.toString()}`);
        } else {
            logError(`❌ ${name} 交易失敗，狀態: ${receipt.status}`);
        }
        
    } catch (e) {
        // 【改进】更详细的错误处理
        logError(`❌ 為 ${name} 設定 Collection URI 時失敗:`);
        logError(`錯誤類型: ${e.constructor.name}`);
        logError(`錯誤訊息: ${e.message}`);
        
        // 解析特定错误
        if (e.message.includes("execution reverted")) {
            logError(`這是智能合約執行失敗錯誤`);
            if (e.message.includes("0x")) {
                const errorCode = e.message.match(/0x[a-fA-F0-9]*/)?.[0];
                logError(`錯誤代碼: ${errorCode || 'unknown'}`);
            }
        }
        
        if (e.message.includes("insufficient funds")) {
            logError(`餘額不足以支付 Gas 費用`);
        }
        
        if (e.message.includes("Ownable: caller is not the owner")) {
            logError(`權限錯誤: 調用者不是合約所有者`);
        }
        
        // 【新增】输出完整堆栈供调试
        console.error("完整錯誤堆疊:", e.stack);
    }
    
    // 【新增】在合约之间添加延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
}

logSuccess("✅ 所有 Collection 元數據 URI 設定完成！");