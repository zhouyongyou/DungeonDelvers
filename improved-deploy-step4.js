// 改进版本的步骤 4: 设定 Collection 元数据 URI
// 包含更详细的错误处理和调试信息

async function step4SetCollectionURIs() {
    // --- 步驟 4: 設定 Collection 元數據 URI (指向靜態 JSON 檔案) ---
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
        
        // 检查合约函数是否存在
        if (typeof contractInstance.setContractURI !== 'function') {
            logError(`❌ ${name} 合約中找不到 setContractURI 函式。請檢查您的合約代碼與 ABI。`);
            continue; 
        }
        
        try {
            const collectionFile = collectionMappings[name];
            const collectionURI = `${FRONTEND_BASE_URL}/metadata/${collectionFile}`;
            
            logInfo(`正在為 ${name} 設定 Collection URI...`);
            logInfo(`  合約地址: ${contractAddress}`);
            logInfo(`  目標 URI: ${collectionURI}`);
            
            // 1. 检查当前签名者是否是合约所有者
            try {
                const contractOwner = await contractInstance.owner();
                const currentSigner = await contractInstance.signer.getAddress();
                logInfo(`  合約所有者: ${contractOwner}`);
                logInfo(`  當前簽名者: ${currentSigner}`);
                
                if (contractOwner.toLowerCase() !== currentSigner.toLowerCase()) {
                    logError(`❌ 權限錯誤: 當前簽名者不是 ${name} 合約的所有者`);
                    continue;
                }
            } catch (ownerError) {
                logWarn(`⚠️  無法檢查 ${name} 合約的所有者 (可能沒有 owner 函式)`);
            }
            
            // 2. 检查合约是否被暂停
            try {
                const isPaused = await contractInstance.paused();
                if (isPaused) {
                    logError(`❌ ${name} 合約目前處於暫停狀態`);
                    continue;
                }
                logInfo(`  合約狀態: 正常運行`);
            } catch (pauseError) {
                logInfo(`  合約狀態: 無法檢查 (可能沒有 paused 函式)`);
            }
            
            // 3. 检查当前的 contractURI
            try {
                const currentURI = await contractInstance.contractURI();
                logInfo(`  當前 URI: ${currentURI}`);
                if (currentURI === collectionURI) {
                    logInfo(`  ✅ URI 已經是目標值，跳過設定`);
                    continue;
                }
            } catch (uriError) {
                logInfo(`  當前 URI: 無法獲取`);
            }
            
            // 4. 估算 Gas
            let gasEstimate;
            try {
                gasEstimate = await contractInstance.setContractURI.estimateGas(collectionURI);
                logInfo(`  預估 Gas: ${gasEstimate.toString()}`);
            } catch (gasError) {
                logError(`❌ ${name} Gas 估算失敗: ${gasError.message}`);
                
                // 解析常见的 Gas 估算错误
                if (gasError.message.includes("execution reverted")) {
                    logError(`  這通常表示函數調用會失敗`);
                    if (gasError.message.includes("Ownable: caller is not the owner")) {
                        logError(`  權限錯誤: 調用者不是合約所有者`);
                    }
                }
                continue;
            }
            
            // 5. 执行干运行测试
            try {
                await contractInstance.setContractURI.staticCall(collectionURI);
                logInfo(`  ✅ 乾運行測試成功`);
            } catch (staticError) {
                logError(`❌ ${name} 乾運行測試失敗: ${staticError.message}`);
                continue;
            }
            
            // 6. 执行实际交易
            logInfo(`  📤 發送交易...`);
            const tx = await contractInstance.setContractURI(collectionURI, {
                gasLimit: gasEstimate * 2n,  // 使用两倍的预估 gas
            });
            
            logInfo(`  交易哈希: ${tx.hash}`);
            logInfo(`  等待交易確認...`);
            
            const receipt = await tx.wait();
            
            if (receipt.status === 1) {
                logSuccess(`✅ ${name} Collection URI 設定成功！`);
                logInfo(`  Gas 使用: ${receipt.gasUsed.toString()}`);
                logInfo(`  區塊號: ${receipt.blockNumber}`);
            } else {
                logError(`❌ ${name} 交易失敗，狀態: ${receipt.status}`);
            }
            
        } catch (e) {
            logError(`❌ 為 ${name} 設定 Collection URI 時發生未預期錯誤:`);
            logError(`  錯誤類型: ${e.constructor.name}`);
            logError(`  錯誤訊息: ${e.message}`);
            
            // 记录完整的错误堆栈（用于调试）
            if (e.stack) {
                logError(`  完整堆疊: ${e.stack}`);
            }
            
            // 解析特定错误类型
            if (e.message.includes("execution reverted")) {
                logError(`  這是智能合約執行失敗錯誤`);
                if (e.message.includes("0x")) {
                    logError(`  錯誤代碼: ${e.message.match(/0x[a-fA-F0-9]*/)?.[0] || 'unknown'}`);
                }
            }
            
            if (e.message.includes("insufficient funds")) {
                logError(`  餘額不足以支付 Gas 費用`);
            }
            
            if (e.message.includes("nonce")) {
                logError(`  Nonce 相關錯誤，可能需要重置錢包`);
            }
        }
        
        // 在每个合约处理之间添加短暂延迟
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    logSuccess("✅ Collection 元數據 URI 設定流程完成！");
}

// 辅助函数，如果你的项目中没有这些
function logInfo(message) {
    console.log(`ℹ️  ${message}`);
}

function logWarn(message) {
    console.log(`⚠️  ${message}`);
}

function logError(message) {
    console.error(`❌ ${message}`);
}

function logSuccess(message) {
    console.log(`✅ ${message}`);
}

function log(message) {
    console.log(message);
}

// 使用示例
// await step4SetCollectionURIs();