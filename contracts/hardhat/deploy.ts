import { ethers, run } from "hardhat";
import "dotenv/config";
// 為了獲得強類型支援，我們從 TypeChain 自動產生的檔案中導入類型
import {
    DungeonCore, DungeonStorage, DungeonMaster, DungeonMasterVRF,
    AltarStorage, AltarOfAscension, PlayerVault,
    Oracle, Test_USD1, Test_SoulShard, VIPStaking,
    Hero, Relic, Party
} from "../typechain-types";

// 延遲函式
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

// --- 部署設定 ---
// 如果您想強制重新部署某個合約，請將其對應的旗標設為 true
const deploymentFlags = {
    FORCE_REDEPLOY_DUNGEONCORE: false,
    FORCE_REDEPLOY_DUNGEONSTORAGE: false,
    FORCE_REDEPLOY_DUNGEONMASTER: false,
    // 【除錯建議】設定為 true 來強制重新部署有問題的合約
    FORCE_REDEPLOY_DUNGEONMASTERVRF: true, 
    FORCE_REDEPLOY_ALTARSTORAGE: false,
    FORCE_REDEPLOY_ALTAROFASCENSION: false,
    FORCE_REDEPLOY_HERO: false,
    FORCE_REDEPLOY_RELIC: false,
    FORCE_REDEPLOY_PARTY: false, 
    FORCE_REDEPLOY_PLAYERPROFILE: false,
};

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`✅ 使用錢包進行部署: ${deployer.address}`);

    // --- 環境變數 ---
    // 【修正 1】進行更安全的變數讀取與檢查
    const vrfWrapperAddress = process.env.VRF_WRAPPER_ADDRESS;
    const newOwnerAddress = process.env.NEW_OWNER_ADDRESS || deployer.address;
    
    if (!vrfWrapperAddress || !ethers.isAddress(vrfWrapperAddress)) {
        throw new Error("錯誤：在 .env 檔案中找不到有效或已設定的 VRF_WRAPPER_ADDRESS");
    }
    console.log(`   ℹ️  使用 VRF Wrapper 地址: ${vrfWrapperAddress}`);


    const deployedContracts: { [name: string]: { instance: any; address: string; args: any[] } } = {};
    const newEnvVars: string[] = [];

    // --- 智能部署/附加函式 ---
    async function getOrDeployContract(name: string, args: any[] = []) {
        const envVarName = `${name.toUpperCase()}_ADDRESS`;
        const existingAddress = process.env[envVarName];
        const forceRedeploy = (deploymentFlags as any)[`FORCE_REDEPLOY_${name.toUpperCase()}`] || false;

        if (existingAddress && !forceRedeploy) {
            console.log(`   - 正在附加至已存在的 ${name} 合約: ${existingAddress}`);
            const instance = await ethers.getContractAt(name, existingAddress);
            deployedContracts[name] = { instance, address: existingAddress, args: [] };
            return instance;
        } else {
            console.log(`   - 正在部署新的 ${name}...`);
            // 【修正 2】在部署前印出參數，方便除錯
            console.log(`     - 部署參數: [${args.join(', ')}]`);
            const Factory = await ethers.getContractFactory(name);
            const contract = await Factory.deploy(...args);
            await contract.waitForDeployment();
            const address = await contract.getAddress();
            
            deployedContracts[name] = { instance: contract, address, args };
            console.log(`   ✅ ${name} 已部署至: ${address}`);
            newEnvVars.push(`${envVarName}=${address}`);
            return contract;
        }
    }

    // =================================================================
    // 步驟 1: 部署或附加所有【儲存合約】與基礎模組
    // =================================================================
    console.log('\n🚀 步驟 1: 部署/附加 基礎與儲存合約...');

    const dungeonStorageInstance = await getOrDeployContract("DungeonStorage", [deployer.address]) as DungeonStorage;
    const altarStorageInstance = await getOrDeployContract("AltarStorage", [deployer.address]) as AltarStorage;
    
    const oracleArgs = [process.env.POOL_ADDRESS || "0x558ce59219ad5ab67a708c21b693198535042b91", deployer.address];
    const oracleInstance = await getOrDeployContract("Oracle", oracleArgs) as Oracle;
    
    let finalUsdTokenAddress: string;
    let finalSoulShardTokenAddress: string;
    if (process.env.USD_TOKEN_ADDRESS && process.env.SOUL_SHARD_TOKEN_ADDRESS) {
        finalUsdTokenAddress = process.env.USD_TOKEN_ADDRESS;
        finalSoulShardTokenAddress = process.env.SOUL_SHARD_TOKEN_ADDRESS;
        console.log('   ℹ️  使用 .env 中的代幣地址。');
    } else {
        const testUsd1Instance = await getOrDeployContract("Test_USD1") as Test_USD1;
        const testSoulShardInstance = await getOrDeployContract("Test_SoulShard") as Test_SoulShard;
        finalUsdTokenAddress = await testUsd1Instance.getAddress();
        finalSoulShardTokenAddress = await testSoulShardInstance.getAddress();
    }
    
    // =================================================================
    // 步驟 2: 部署或附加核心合約 DungeonCore
    // =================================================================
    console.log('\n🚀 步驟 2: 部署/附加 核心樞紐 DungeonCore...');
    const dungeonCoreInstance = await getOrDeployContract("DungeonCore", [deployer.address]) as DungeonCore;
    const dungeonCoreAddress = await dungeonCoreInstance.getAddress();

    // =================================================================
    // 步驟 3: 部署或附加所有【邏輯合約】與【衛星合約】
    // =================================================================
    console.log('\n🚀 步驟 3: 部署/附加 遊戲模組合約...');
    
    const vrfArgs = [vrfWrapperAddress, deployer.address];
    const vrfInstance = await getOrDeployContract("DungeonMasterVRF", vrfArgs) as DungeonMasterVRF;

    const dmArgs = [dungeonCoreAddress, await dungeonStorageInstance.getAddress(), deployer.address];
    const dmInstance = await getOrDeployContract("DungeonMaster", dmArgs) as DungeonMaster;

    const altarArgs = [dungeonCoreAddress, await altarStorageInstance.getAddress(), vrfWrapperAddress, deployer.address];
    const altarOfAscensionInstance = await getOrDeployContract("AltarOfAscension", altarArgs) as AltarOfAscension;

    const heroArgs = [dungeonCoreAddress, vrfWrapperAddress, deployer.address];
    const heroInstance = await getOrDeployContract("Hero", heroArgs) as Hero;

    const relicArgs = [dungeonCoreAddress, vrfWrapperAddress, deployer.address];
    const relicInstance = await getOrDeployContract("Relic", relicArgs) as Relic;

    const partyArgs = [dungeonCoreAddress, deployer.address];
    const partyInstance = await getOrDeployContract("Party", partyArgs) as Party;

    const profileArgs = [dungeonCoreAddress, deployer.address];
    const playerProfileInstance = await getOrDeployContract("PlayerProfile", profileArgs) as any;

    const playerVaultArgs = [dungeonCoreAddress, finalSoulShardTokenAddress, deployer.address];
    const playerVaultInstance = await getOrDeployContract("PlayerVault", playerVaultArgs) as PlayerVault;
    
    const vipStakingArgs = [dungeonCoreAddress, finalSoulShardTokenAddress, deployer.address];
    const vipStakingInstance = await getOrDeployContract("VIPStaking", vipStakingArgs) as VIPStaking;
    
    // =================================================================
    // 步驟 4: 授權與設定
    // =================================================================
    console.log('\n🚀 步驟 4: 檢查並執行授權與設定...');
    
    if ((await dungeonStorageInstance.logicContract()).toLowerCase() !== (await dmInstance.getAddress()).toLowerCase()) {
        console.log('   - 正在授權 DungeonMaster 可以修改 DungeonStorage...');
        await (await dungeonStorageInstance.setLogicContract(await dmInstance.getAddress())).wait(1);
    }
    if ((await altarStorageInstance.logicContract()).toLowerCase() !== (await altarOfAscensionInstance.getAddress()).toLowerCase()) {
        console.log('   - 正在授權 AltarOfAscension 可以修改 AltarStorage...');
        await (await altarStorageInstance.setLogicContract(await altarOfAscensionInstance.getAddress())).wait(1);
    }
    if ((await vrfInstance.mainLogicContract()).toLowerCase() !== (await dmInstance.getAddress()).toLowerCase()) {
        console.log('   - 正在設定 VRF 合約的主邏輯地址...');
        await (await vrfInstance.setMainLogicContract(await dmInstance.getAddress())).wait(1);
    }
    if ((await dmInstance.vrfContract()).toLowerCase() !== (await vrfInstance.getAddress()).toLowerCase()) {
        console.log('   - 正在設定主邏輯合約的 VRF 地址...');
        await (await dmInstance.setVrfContract(await vrfInstance.getAddress())).wait(1);
    }
    console.log('   ✅ 儲存與衛星合約授權檢查完成！');
    
    console.log('   - 正在檢查並設定 DungeonCore 的模組地址...');
    const modulesToSet: { [key: string]: string } = {
        setPlayerVault: await playerVaultInstance.getAddress(),
        setPlayerProfile: await playerProfileInstance.getAddress(),
        setDungeonMaster: await dmInstance.getAddress(),
        setHeroContract: await heroInstance.getAddress(),
        setRelicContract: await relicInstance.getAddress(),
        setPartyContract: await partyInstance.getAddress(),
        setAltarOfAscension: await altarOfAscensionInstance.getAddress(),
        setVipStaking: await vipStakingInstance.getAddress(),
        setOracle: await oracleInstance.getAddress(),
        setUsdToken: finalUsdTokenAddress,
    };

    for (const setter in modulesToSet) {
        const addressToSet = modulesToSet[setter];
        const getterName = setter.replace('set', '').charAt(0).toLowerCase() + setter.slice(4);
        
        let currentAddress = ethers.ZeroAddress;
        if (typeof (dungeonCoreInstance as any)[getterName] === 'function') {
            currentAddress = await (dungeonCoreInstance as any)[getterName]();
        } else {
            console.warn(`   ⚠️ 找不到 getter: ${getterName}，無法檢查是否需要更新。`);
        }
        
        if (currentAddress.toLowerCase() !== addressToSet.toLowerCase()) {
            console.log(`     - 正在執行 ${setter}(${addressToSet})...`);
            await ((dungeonCoreInstance as any)[setter](addressToSet)).wait(1);
        }
    }
    console.log('   ✅ DungeonCore 模組地址設定檢查完成！');
    
    // =================================================================
    // 步驟 5: 初始化遊戲數據
    // =================================================================
    console.log('\n🚀 步驟 5: 檢查並初始化遊戲數據...');
    
    try {
        const dungeon = await dungeonStorageInstance.getDungeon(1);
        if (!dungeon.isInitialized) {
            console.log('   - 正在初始化 DungeonMaster...');
            await (await dmInstance.bulkInitializeDungeons()).wait(1);
        }
    } catch (e) {
        console.log('   - 偵測到 Dungeon 尚未初始化，執行初始化...');
        await (await dmInstance.bulkInitializeDungeons()).wait(1);
    }
    
    try {
        const rule1 = await altarStorageInstance.getUpgradeRule(1);
        if (rule1.requiredCount == 0) {
            console.log('   - 正在初始化 AltarOfAscension...');
            await (await altarOfAscensionInstance.initializeRules()).wait(1);
        }
    } catch (e) {
        console.log('   - 偵測到 Altar 尚未初始化，執行初始化...');
        await (await altarOfAscensionInstance.initializeRules()).wait(1);
    }
    console.log('   ✅ 遊戲數據初始化檢查完成！');

    // =================================================================
    // 步驟 6: 轉移所有權
    // =================================================================
    if (newOwnerAddress && newOwnerAddress.toLowerCase() !== deployer.address.toLowerCase()) {
        console.log(`\n🚀 步驟 6: 準備將所有權轉移至: ${newOwnerAddress}`);
        for (const name in deployedContracts) {
            const contract = deployedContracts[name].instance;
            if (contract && typeof contract.transferOwnership === "function") {
                const currentOwner = await contract.owner();
                if (currentOwner.toLowerCase() !== newOwnerAddress.toLowerCase()) {
                    console.log(`   - 正在轉移 ${name} 的所有權...`);
                    const tx = await contract.transferOwnership(newOwnerAddress);
                    await tx.wait(1);
                }
            }
        }
        console.log('   ✅ 所有合約權限已成功轉移！');
    } else {
        console.log("\n⚠️ 新擁有者地址與部署者相同或未設定，跳過權限轉移。");
    }

    // =================================================================
    // 步驟 7: 在 BscScan 上驗證合約
    // =================================================================
    console.log("\n⏳ 等待 30 秒，讓區塊鏈瀏覽器索引合約...");
    await delay(30000);

    console.log("\n🚀 步驟 7: 開始在 BscScan 上驗證合約...");
    for (const name in deployedContracts) {
        // 只驗證本次新部署的合約
        if (newEnvVars.every(v => !v.startsWith(`${name.toUpperCase()}_ADDRESS`))) {
            console.log(`   - ℹ️  跳過驗證已存在的合約 ${name}`);
            continue;
        }
        
        console.log(`   - 正在驗證 ${name}...`);
        try {
            await run("verify:verify", {
                address: deployedContracts[name].address,
                constructorArguments: deployedContracts[name].args,
            });
            console.log(`   ✅ ${name} 驗證成功！`);
        } catch (e: any) {
            if (e.message.toLowerCase().includes("already verified")) {
                console.log(`   ℹ️  ${name} 已經驗證過了。`);
            } else {
                console.error(`   ❌ ${name} 驗證失敗:`, e.message);
            }
        }
    }
    
    // =================================================================
    // 總結
    // =================================================================
    if (newEnvVars.length > 0) {
        console.log('\n\n====================================================');
        console.log('✅ 新合約已部署！請將以下變數新增至您的 .env 檔案:');
        console.log('----------------------------------------------------');
        console.log(newEnvVars.join('\n'));
        console.log('====================================================\n');
    } else {
        console.log('\n\n✅ 所有合約均使用現有地址，未部署新合約。\n');
    }
    
    console.log('✅✅✅ 部署流程完成！ ✅✅✅');
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
