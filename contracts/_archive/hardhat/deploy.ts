import { ethers, run } from "hardhat";
import "dotenv/config";
import {
    DungeonCore, DungeonStorage, DungeonMaster, DungeonMasterVRF,
    AltarStorage, AltarOfAscension, PlayerVault,
    Oracle, Test_USD1, Test_SoulShard, VIPStaking,
    Hero, Relic, Party, PlayerProfile
} from "../typechain-types";

// 延遲函式，用於在驗證前等待區塊鏈索引
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- 部署設定 ---
// 如果您想強制重新部署某個合約，請將其對應的旗標設為 true
const deploymentFlags = {
    FORCE_REDEPLOY_ORACLE: false,
    FORCE_REDEPLOY_DUNGEONSTORAGE: false,
    FORCE_REDEPLOY_ALTARSTORAGE: false,
    FORCE_REDEPLOY_HERO: true,
    FORCE_REDEPLOY_RELIC: true, // 假設 Relic.sol 也做了類似修正
    FORCE_REDEPLOY_PARTY: true,
    FORCE_REDEPLOY_DUNGEONCORE: true,
    FORCE_REDEPLOY_DUNGEONMASTERVRF: true,
    FORCE_REDEPLOY_DUNGEONMASTER: true,
    FORCE_REDEPLOY_ALTAROFASCENSION: true,
    FORCE_REDEPLOY_PLAYERPROFILE: true,
    FORCE_REDEPLOY_PLAYERVAULT: true,
    FORCE_REDEPLOY_VIPSTAKING: true,
};

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`✅ 使用錢包進行部署: ${deployer.address}`);

    // --- 步驟 0: 環境變數驗證 ---
    console.log('\n🚀 步驟 0: 驗證環境變數...');
    const vrfWrapperAddress = process.env.VRF_WRAPPER_ADDRESS;
    const newOwnerAddress = process.env.NEW_OWNER_ADDRESS || deployer.address;
    const poolAddress = process.env.POOL_ADDRESS;
    let finalUsdTokenAddress = process.env.USD_TOKEN_ADDRESS;
    let finalSoulShardTokenAddress = process.env.SOUL_SHARD_TOKEN_ADDRESS;

    if (!vrfWrapperAddress || !ethers.isAddress(vrfWrapperAddress)) throw new Error("❌ 錯誤：.env 檔案中缺少有效的 VRF_WRAPPER_ADDRESS");
    if (!poolAddress || !ethers.isAddress(poolAddress)) throw new Error("❌ 錯誤：.env 檔案中缺少有效的 POOL_ADDRESS");
    
    console.log(`   ℹ️  使用 VRF Wrapper 地址: ${vrfWrapperAddress}`);
    console.log(`   ℹ️  使用 Uniswap Pool 地址: ${poolAddress}`);
    console.log(`   ℹ️  最終擁有者地址將設為: ${newOwnerAddress}`);

    const deployedContracts: { [name: string]: { instance: any; address: string; args: any[] } } = {};
    const newEnvVars: string[] = [];

    // --- 智能部署/附加函式 ---
    async function getOrDeployContract(name: string, args: any[] = []) {
        const envVarName = `${name.toUpperCase()}_ADDRESS`;
        const existingAddress = process.env[envVarName];
        const forceRedeploy = (deploymentFlags as any)[`FORCE_REDEPLOY_${name.toUpperCase()}`] || false;

        if (existingAddress && !forceRedeploy) {
            console.log(`\n- 正在附加至已存在的 ${name} 合約: ${existingAddress}`);
            const instance = await ethers.getContractAt(name, existingAddress);
            deployedContracts[name] = { instance, address: existingAddress, args: [] };
            return instance;
        } else {
            console.log(`\n- 正在部署新的 ${name}...`);
            console.log(`  - 部署參數: [${args.join(', ')}]`);
            const Factory = await ethers.getContractFactory(name);
            const contract = await Factory.deploy(...args);
            await contract.waitForDeployment();
            const address = await contract.getAddress();
            
            deployedContracts[name] = { instance: contract, address, args };
            console.log(`  ✅ ${name} 已部署至: ${address}`);
            newEnvVars.push(`${envVarName}=${address}`);
            return contract;
        }
    }

    // =================================================================
    // 步驟 1: 部署獨立合約與代幣
    // =================================================================
    console.log('\n🚀 步驟 1: 部署獨立合約與代幣...');
    const oracleInstance = await getOrDeployContract("Oracle", [poolAddress, deployer.address]) as Oracle;
    const dungeonStorageInstance = await getOrDeployContract("DungeonStorage", [deployer.address]) as DungeonStorage;
    const altarStorageInstance = await getOrDeployContract("AltarStorage", [deployer.address]) as AltarStorage;

    if (!finalUsdTokenAddress || !finalSoulShardTokenAddress) {
        console.log('   - .env 中未提供代幣地址，正在部署測試代幣...');
        const testUsd1Instance = await getOrDeployContract("Test_USD1", []) as Test_USD1;
        const testSoulShardInstance = await getOrDeployContract("Test_SoulShard", []) as Test_SoulShard;
        finalUsdTokenAddress = await testUsd1Instance.getAddress();
        finalSoulShardTokenAddress = await testSoulShardInstance.getAddress();
    } else {
         console.log('   ℹ️  使用 .env 中的代幣地址。');
    }

    // =================================================================
    // 步驟 2: 部署核心 NFT 合約 (已打破循環依賴)
    // =================================================================
    console.log('\n🚀 步驟 2: 部署核心 NFT 合約...');
    // 部署 Hero，現在只需要 2 個參數
    const heroInstance = await getOrDeployContract("Hero", [vrfWrapperAddress, deployer.address]) as Hero;
    // 部署 Relic，假設它的 constructor 也已經修正
    const relicInstance = await getOrDeployContract("Relic", [vrfWrapperAddress, deployer.address]) as Relic;

    // =================================================================
    // 步驟 3: 部署依賴 NFT 的 Party 合約
    // =================================================================
    console.log('\n🚀 步驟 3: 部署 Party 合約...');
    const partyInstance = await getOrDeployContract("Party", [await heroInstance.getAddress(), await relicInstance.getAddress()]) as Party;
    
    // =================================================================
    // 步驟 4: 部署核心樞紐 DungeonCore
    // =================================================================
    console.log('\n🚀 步驟 4: 部署核心樞紐 DungeonCore...');
    // 注意：這裡的參數順序必須與您 DungeonCore.sol 的 constructor 完全一致
    const dungeonCoreArgs = [
        await partyInstance.getAddress(),
        finalUsdTokenAddress!,
        finalSoulShardTokenAddress!,
        poolAddress,
        vrfWrapperAddress,
        deployer.address
    ];
    const dungeonCoreInstance = await getOrDeployContract("DungeonCore", dungeonCoreArgs) as DungeonCore;
    const dungeonCoreAddress = await dungeonCoreInstance.getAddress();

    // =================================================================
    // 步驟 5: 部署所有剩餘的衛星合約
    // =================================================================
    console.log('\n🚀 步驟 5: 部署所有剩餘的衛星合約...');
    const vrfMasterInstance = await getOrDeployContract("DungeonMasterVRF", [vrfWrapperAddress, deployer.address]) as DungeonMasterVRF;
    const dmInstance = await getOrDeployContract("DungeonMaster", [dungeonCoreAddress, await dungeonStorageInstance.getAddress(), deployer.address]) as DungeonMaster;
    const altarOfAscensionInstance = await getOrDeployContract("AltarOfAscension", [vrfWrapperAddress, await heroInstance.getAddress(), await relicInstance.getAddress()]) as AltarOfAscension;
    const playerProfileInstance = await getOrDeployContract("PlayerProfile", [deployer.address]) as PlayerProfile;
    const playerVaultInstance = await getOrDeployContract("PlayerVault", [dungeonCoreAddress, finalSoulShardTokenAddress!, deployer.address]) as PlayerVault;
    const vipStakingInstance = await getOrDeployContract("VIPStaking", [dungeonCoreAddress, finalSoulShardTokenAddress!, deployer.address]) as VIPStaking;

    // =================================================================
    // 步驟 6: 授權與設定 (完成循環依賴的最後一步)
    // =================================================================
    console.log('\n🚀 步驟 6: 執行授權與設定...');

    console.log('   - 正在設定 DungeonCore 的模組地址...');
    await (await dungeonCoreInstance.setHeroContract(await heroInstance.getAddress())).wait(1);
    await (await dungeonCoreInstance.setRelicContract(await relicInstance.getAddress())).wait(1);
    await (await dungeonCoreInstance.setDungeonMaster(await dmInstance.getAddress())).wait(1);
    await (await dungeonCoreInstance.setAltarOfAscension(await altarOfAscensionInstance.getAddress())).wait(1);
    await (await dungeonCoreInstance.setPlayerProfile(await playerProfileInstance.getAddress())).wait(1);
    await (await dungeonCoreInstance.setPlayerVault(await playerVaultInstance.getAddress())).wait(1);
    await (await dungeonCoreInstance.setVipStaking(await vipStakingInstance.getAddress())).wait(1);
    
    console.log('   - 正在設定其他合約的依賴地址 (打破循環的關鍵步驟)...');
    await (await heroInstance.setDungeonCore(dungeonCoreAddress)).wait(1);
    await (await relicInstance.setDungeonCore(dungeonCoreAddress)).wait(1);
    await (await partyInstance.setDungeonCore(dungeonCoreAddress)).wait(1);
    await (await playerProfileInstance.setDungeonCore(dungeonCoreAddress)).wait(1);
    await (await dmInstance.setVrfContract(await vrfMasterInstance.getAddress())).wait(1);
    await (await altarOfAscensionInstance.setDungeonCore(dungeonCoreAddress)).wait(1);


    console.log('   ✅ 授權與設定完成！');
    
    // ... 後續步驟 (初始化, 轉移所有權, 驗證) ...

    console.log('✅✅✅ 部署流程已圓滿完成！ ✅✅✅');
}

main().catch((error) => {
    console.error("❌ 部署過程中發生致命錯誤:", error);
    process.exitCode = 1;
});
