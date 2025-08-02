// deploy-hero-vrfv25-official.js - BSC 主網部署腳本
const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 開始在 BSC 主網部署 HeroWithChainlinkVRFV25_Official 合約...");

    // 獲取部署者帳戶
    const [deployer] = await ethers.getSigners();
    console.log("📝 部署者地址:", deployer.address);
    console.log("💰 部署者 BNB 餘額:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "BNB");

    // ★ BSC 主網 VRF v2.5 Direct Funding 配置 (基於官方文檔)
    const BSC_VRF_CONFIG = {
        wrapperAddress: "0x471506e6ADED0b9811D05B8cAc8Db25eE839Ac94", // 官方確認的 BSC 主網 VRF Wrapper
        linkToken: "0x404460C6A5EdE2D891e8297795264fDe62ADBB75",      // 官方確認的 BSC 主網 LINK
        coordinatorAddress: "0xd691f04bc0C9a24Edb78af9E005Cf85768F694C9", // VRF Coordinator
        gasLimit: 100000
    };

    console.log("🔧 BSC 主網 VRF v2.5 Direct Funding 配置 (官方確認):");
    console.log("  - VRF Wrapper:", BSC_VRF_CONFIG.wrapperAddress);
    console.log("  - LINK Token:", BSC_VRF_CONFIG.linkToken);
    console.log("  - VRF Coordinator:", BSC_VRF_CONFIG.coordinatorAddress);
    console.log("  - Gas Limit:", BSC_VRF_CONFIG.gasLimit);
    console.log("  - Premium 比例 (BNB): 60%");
    console.log("  - Premium 比例 (LINK): 50%");
    console.log("  - 最小確認數: 3");
    console.log("  - 最大確認數: 200");
    console.log("  - 最大隨機值: 10");
    console.log("  - Wrapper Gas 開銷: 13,400");
    console.log("  - Coordinator Gas 開銷 (Native): 99,500");
    console.log("  - Coordinator Gas 開銷 (LINK): 121,500");

    // 檢查 LINK 代幣餘額
    const linkTokenABI = [
        "function balanceOf(address owner) external view returns (uint256)"
    ];
    
    const linkToken = new ethers.Contract(BSC_VRF_CONFIG.linkToken, linkTokenABI, deployer);
    const linkBalance = await linkToken.balanceOf(deployer.address);
    console.log("🔗 部署者 LINK 餘額:", ethers.formatEther(linkBalance), "LINK");

    // 估算 BSC 鏈成本 (基於官方 Gas 開銷)
    console.log("💰 BSC 鏈預估成本: $0.03-0.08/次");
    console.log("   - Wrapper Gas: 13,400");
    console.log("   - Coordinator Gas (Native): 99,500");
    console.log("   - 總 Gas 開銷: ~113,000");

    try {
        // 部署 HeroWithChainlinkVRFV25_Official 合約
        console.log("\n📦 部署 HeroWithChainlinkVRFV25_Official 合約...");
        const HeroWithChainlinkVRFV25_Official = await ethers.getContractFactory("HeroWithChainlinkVRFV25_Official");
        
        const heroContract = await HeroWithChainlinkVRFV25_Official.deploy(
            deployer.address,                    // initialOwner
            BSC_VRF_CONFIG.wrapperAddress,      // _wrapperAddress
            BSC_VRF_CONFIG.linkToken            // _linkToken
        );

        await heroContract.waitForDeployment();
        const heroAddress = await heroContract.getAddress();
        
        console.log("✅ HeroWithChainlinkVRFV25_Official 合約部署成功!");
        console.log("📍 合約地址:", heroAddress);

        // 驗證合約
        console.log("\n🔍 驗證合約...");
        try {
            await hre.run("verify:verify", {
                address: heroAddress,
                constructorArguments: [
                    deployer.address,
                    BSC_VRF_CONFIG.wrapperAddress,
                    BSC_VRF_CONFIG.linkToken
                ],
            });
            console.log("✅ 合約驗證成功!");
        } catch (error) {
            console.log("⚠️  合約驗證失敗:", error.message);
        }

        // 輸出部署信息
        console.log("\n📋 部署信息:");
        console.log("==================");
        console.log("合約名稱: HeroWithChainlinkVRFV25_Official");
        console.log("合約地址:", heroAddress);
        console.log("部署者:", deployer.address);
        console.log("網絡: BSC 主網 (Chain ID: 56)");
        console.log("VRF Wrapper:", BSC_VRF_CONFIG.wrapperAddress);
        console.log("LINK Token:", BSC_VRF_CONFIG.linkToken);
        console.log("VRF Coordinator:", BSC_VRF_CONFIG.coordinatorAddress);
        console.log("預估成本: $0.03-0.08/次");
        console.log("支付模式: 玩家付費");
        console.log("原生代幣支付: 啟用");
        console.log("==================");

        // 保存部署信息到文件
        const deploymentInfo = {
            contractName: "HeroWithChainlinkVRFV25_Official",
            contractAddress: heroAddress,
            deployer: deployer.address,
            network: "BSC Mainnet (Chain ID: 56)",
            vrfConfig: BSC_VRF_CONFIG,
            estimatedCost: "$0.03-0.08/次",
            paymentMode: "Player Pays",
            nativePayment: true,
            deploymentTime: new Date().toISOString(),
            constructorArgs: [
                deployer.address,
                BSC_VRF_CONFIG.wrapperAddress,
                BSC_VRF_CONFIG.linkToken
            ]
        };

        const fs = require('fs');
        const deploymentFile = `deployment-hero-vrfv25-official-bsc.json`;
        fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
        console.log(`💾 部署信息已保存到: ${deploymentFile}`);

        console.log("\n🎉 部署完成! 接下來需要:");
        console.log("1. 設置 DungeonCore 和 SoulShard 合約地址");
        console.log("2. 設置 AscensionAltar 地址");
        console.log("3. 配置 VRF 參數 (可選)");
        console.log("4. 設置支付模式 (原生代幣或 LINK)");

        // 顯示後續配置命令
        console.log("\n🔧 後續配置命令:");
        console.log("==================");
        console.log(`// 設置 DungeonCore`);
        console.log(`await heroContract.setDungeonCore("${deployer.address}");`);
        console.log("");
        console.log(`// 設置 SoulShard 代幣`);
        console.log(`await heroContract.setSoulShardToken("${deployer.address}");`);
        console.log("");
        console.log(`// 設置 AscensionAltar`);
        console.log(`await heroContract.setAscensionAltarAddress("${deployer.address}");`);
        console.log("");
        console.log(`// 設置 BaseURI`);
        console.log(`await heroContract.setBaseURI("https://api.example.com/heroes/");`);
        console.log("");
        console.log(`// 配置 VRF 參數`);
        console.log(`await heroContract.setVRFConfig(3, ${BSC_VRF_CONFIG.gasLimit}, 1);`);
        console.log("");
        console.log(`// 設置原生代幣支付 (推薦)`);
        console.log(`await heroContract.setNativePayment(true);`);
        console.log("");
        console.log(`// 設置 VRF 閾值`);
        console.log(`await heroContract.setVRFThreshold(10);`);
        console.log("==================");

        console.log("\n💡 BSC 主網 Direct Funding 優勢:");
        console.log("- 支持原生 BNB 支付 VRF 費用");
        console.log("- 極低的 VRF 費用: $0.03-0.08/次");
        console.log("- 快速的交易確認");
        console.log("- 豐富的 DeFi 生態");
        console.log("- 與 Binance 生態整合");
        console.log("- 無需預付 LINK 代幣");

        console.log("\n💰 玩家付費模式:");
        console.log("- 玩家直接支付 BNB");
        console.log("- 包含 VRF 費用和 Gas 費用");
        console.log("- 費用完全透明");
        console.log("- 無需管理 LINK 代幣");

    } catch (error) {
        console.error("❌ 部署失敗:", error);
        process.exit(1);
    }
}

// 錯誤處理
main().catch((error) => {
    console.error("❌ 腳本執行失敗:", error);
    process.exit(1);
}); 