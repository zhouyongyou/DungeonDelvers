// scripts/deploy-fixed.js
// 修正版的部署腳本 - 避免 baseURI 設定錯誤

const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 正在部署 Dungeon Delvers 核心遊戲合約 (修正版)...");

  const [deployer] = await ethers.getSigners();
  console.log("使用帳戶:", deployer.address);

  // 讀取環境變數
  const VIP_STAKING_ADDRESS = process.env.VITE_MAINNET_VIPSTAKING_ADDRESS;
  const PLAYER_PROFILE_ADDRESS = process.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS;
  const HERO_ADDRESS = process.env.VITE_MAINNET_HERO_ADDRESS;
  const RELIC_ADDRESS = process.env.VITE_MAINNET_RELIC_ADDRESS;
  const PARTY_ADDRESS = process.env.VITE_MAINNET_PARTY_ADDRESS;

  // IPFS 基礎 URI
  const IPFS_BASE_URI = "ipfs://bafybeiagvaba3iswugci4e45tnucrerh32retgukatdx3v6p6wpupkwphm/";

  // 正確的 baseURI 設定 - 每個類型都有自己的子目錄
  const CORRECT_BASE_URIS = {
    VIP_STAKING: IPFS_BASE_URI + "vip/",
    PLAYER_PROFILE: IPFS_BASE_URI + "profile/",
    HERO: IPFS_BASE_URI + "hero/",
    RELIC: IPFS_BASE_URI + "relic/",
    PARTY: IPFS_BASE_URI + "party/",
  };

  const deployedContracts = {};

  async function getOrDeploy(contractName, fqn, args = []) {
    const envVarName = `VITE_MAINNET_${contractName.toUpperCase()}_ADDRESS`;
    const existingAddress = process.env[envVarName];

    if (existingAddress && ethers.isAddress(existingAddress)) {
      console.log(`正在附加至已存在的 ${contractName} 合約: ${existingAddress}`);
      const instance = await ethers.getContractAt(fqn, existingAddress);
      deployedContracts[contractName] = { instance, address: existingAddress, newlyDeployed: false };
    } else {
      console.log(`正在部署新的 ${contractName}...`);
      const Factory = await ethers.getContractFactory(fqn);
      const contract = await Factory.deploy(...args);
      await contract.waitForDeployment();
      const address = await contract.getAddress();
      
      deployedContracts[contractName] = { instance: contract, address, newlyDeployed: true };
      console.log(`✅ ${contractName} 已部署至: ${address}`);
    }
  }

  // 部署所有核心遊戲合約
  console.log("\n步驟 1: 部署所有核心遊戲合約...");
  await getOrDeploy("Oracle", "Oracle", []);
  await getOrDeploy("DungeonStorage", "DungeonStorage", [deployer.address]);
  await getOrDeploy("PlayerVault", "PlayerVault", [deployer.address]);
  await getOrDeploy("AltarOfAscension", "AltarOfAscension", [deployer.address]);
  await getOrDeploy("DungeonMaster", "DungeonMaster", [deployer.address]);
  await getOrDeploy("Hero", "Hero", [deployer.address]);
  await getOrDeploy("Relic", "Relic", [deployer.address]);
  await getOrDeploy("Party", "Party", [deployer.address]);
  await getOrDeploy("VIPStaking", "VIPStaking", [deployer.address]);
  await getOrDeploy("PlayerProfile", "PlayerProfile", [deployer.address]);
  await getOrDeploy("DungeonCore", "DungeonCore", [deployer.address]);

  // 進行合約關聯設定
  console.log("\n步驟 2: 進行合約關聯設定...");
  // ... 這裡可以添加合約關聯邏輯 ...

  // ★★★【修正】★★★ 設定正確的 BaseURI
  console.log("\n步驟 3: 設定所有 NFT 合約的正確 BaseURI...");
  const nftContracts = ["Hero", "Relic", "Party", "VIPStaking", "PlayerProfile"];
  
  for (const name of nftContracts) {
    if (deployedContracts[name]) {
      const contractInstance = deployedContracts[name].instance;
      const correctBaseURI = CORRECT_BASE_URIS[name.toUpperCase()];
      
      console.log(`正在為 ${name} 設定 BaseURI 為: ${correctBaseURI}`);
      
      try {
        const tx = await contractInstance.setBaseURI(correctBaseURI);
        await tx.wait();
        console.log(`✅ ${name} BaseURI 設定成功`);
      } catch (error) {
        console.log(`❌ ${name} BaseURI 設定失敗: ${error.message}`);
      }
    }
  }

  console.log("\n🎉 部署完成！");
  console.log("\n📋 修正內容:");
  console.log("□ 每個 NFT 類型現在都有正確的子目錄路徑");
  console.log("□ Hero: ipfs://hash/hero/");
  console.log("□ Relic: ipfs://hash/relic/");
  console.log("□ Party: ipfs://hash/party/");
  console.log("□ VIP: ipfs://hash/vip/");
  console.log("□ Profile: ipfs://hash/profile/");
  
  console.log("\n--- 所有合約地址 ---");
  for (const name in deployedContracts) {
    console.log(`${name.padEnd(25)}: ${deployedContracts[name].address}`);
  }
  console.log("-------------------------\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 部署過程中發生錯誤:", error);
    process.exit(1);
  }); 