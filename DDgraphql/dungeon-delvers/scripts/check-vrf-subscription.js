const { ethers } = require("hardhat");

async function main() {
    const SUBSCRIPTION_ID = "114131353280130458891383141995968474440293173552039681622016393393251650814328";
    console.log(`🔍 檢查 VRF Subscription ID: ${SUBSCRIPTION_ID}`);
    
    // VRF Coordinator V2.5 地址 (BSC Mainnet)
    const VRF_COORDINATOR = "0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9";
    
    // VRF Coordinator V2.5 ABI (使用 uint256 subscription ID)
    const VRF_COORDINATOR_ABI = [
        "function getSubscription(uint256 subId) external view returns (uint96 balance, uint64 reqCount, address owner, address[] memory consumers)",
        "function pendingRequestExists(uint256 subId) external view returns (bool)",
        "function getRequestConfig() external view returns (uint16, uint32, bytes32[] memory)"
    ];
    
    try {
        // 連接到 BSC RPC
        const provider = new ethers.JsonRpcProvider("https://bsc-dataseed1.binance.org/");
        const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR, VRF_COORDINATOR_ABI, provider);
        
        console.log("📡 正在查詢訂閱資訊...");
        
        // 查詢訂閱資訊
        const subscriptionInfo = await vrfCoordinator.getSubscription(SUBSCRIPTION_ID);
        
        console.log("\n✅ 訂閱資訊：");
        console.log(`📋 Subscription ID: ${SUBSCRIPTION_ID}`);
        console.log(`💰 LINK 餘額: ${ethers.formatEther(subscriptionInfo.balance)} LINK`);
        console.log(`📊 請求次數: ${subscriptionInfo.reqCount}`);
        console.log(`👤 擁有者: ${subscriptionInfo.owner}`);
        console.log(`🏢 Consumer 合約數量: ${subscriptionInfo.consumers.length}`);
        
        if (subscriptionInfo.consumers.length > 0) {
            console.log("\n🔗 已授權的 Consumer 合約：");
            subscriptionInfo.consumers.forEach((consumer, index) => {
                console.log(`  ${index + 1}. ${consumer}`);
                
                // 檢查是否包含我們的合約
                const expectedContracts = {
                    "0xc0bbae55cf9245f76628d2c5299cd6fa35cd102a": "DungeonMaster",
                    "0xa86749237d4631ad92ba859d0b0df4770f6147ba": "AltarOfAscension",
                    "0x980d224ec4d198d94f34a8af76a19c00dabe2436": "VRFManager"
                };
                
                if (expectedContracts[consumer]) {
                    console.log(`    ✅ ${expectedContracts[consumer]} - 已正確授權`);
                }
            });
        } else {
            console.log("\n⚠️  警告：沒有授權任何 Consumer 合約！");
        }
        
        // 檢查是否有未完成的請求
        const hasPendingRequests = await vrfCoordinator.pendingRequestExists(SUBSCRIPTION_ID);
        console.log(`\n🔄 是否有未完成的請求: ${hasPendingRequests ? "是" : "否"}`);
        
        // 檢查餘額是否足夠
        const balanceInEther = parseFloat(ethers.formatEther(subscriptionInfo.balance));
        if (balanceInEther < 0.1) {
            console.log("\n🚨 警告：LINK 餘額不足！建議充值至少 1 LINK");
            console.log(`   當前餘額: ${balanceInEther.toFixed(6)} LINK`);
        } else {
            console.log(`\n✅ LINK 餘額充足: ${balanceInEther.toFixed(6)} LINK`);
        }
        
        // 驗證擁有者
        const expectedOwner = "0x10925A7138649C7E1794CE646182eeb5BF8ba647";
        if (subscriptionInfo.owner.toLowerCase() === expectedOwner.toLowerCase()) {
            console.log(`\n✅ 擁有者正確: ${subscriptionInfo.owner}`);
        } else {
            console.log(`\n⚠️  擁有者不匹配！`);
            console.log(`   期望: ${expectedOwner}`);
            console.log(`   實際: ${subscriptionInfo.owner}`);
        }
        
        // 使用建議
        console.log("\n📝 使用建議：");
        console.log("1. 如果餘額不足，請到 https://vrf.chain.link/bsc 充值");
        console.log("2. 確保所有需要使用 VRF 的合約都已添加為 Consumer");
        console.log("3. 定期監控餘額，避免服務中斷");
        
    } catch (error) {
        if (error.message.includes("InvalidSubscription")) {
            console.error(`\n❌ 訂閱 ID ${SUBSCRIPTION_ID} 不存在！`);
            console.log("\n🔧 解決方案：");
            console.log("1. 訪問 https://vrf.chain.link/bsc");
            console.log("2. 連接錢包創建新訂閱");
            console.log("3. 更新配置文件中的 subscriptionId");
        } else {
            console.error("查詢失敗:", error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });