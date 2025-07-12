// scripts/set-ipfs-baseuri.js
// 設定所有合約的 baseURI 為正確的 IPFS URI

const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 開始設定正確的 IPFS baseURI...");

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

  const [deployer] = await ethers.getSigners();
  console.log("使用帳戶:", deployer.address);

  // 設定 VIP Staking baseURI
  if (VIP_STAKING_ADDRESS) {
    console.log("\n1. 設定 VIP Staking baseURI...");
    const vipStaking = await ethers.getContractAt("VIPStaking", VIP_STAKING_ADDRESS);
    const vipBaseURI = CORRECT_BASE_URIS.VIP_STAKING;
    
    try {
      const tx = await vipStaking.setBaseURI(vipBaseURI);
      await tx.wait();
      console.log("✅ VIP Staking baseURI 設定成功:", vipBaseURI);
    } catch (error) {
      console.log("❌ VIP Staking baseURI 設定失敗:", error.message);
    }
  }

  // 設定 Player Profile baseURI
  if (PLAYER_PROFILE_ADDRESS) {
    console.log("\n2. 設定 Player Profile baseURI...");
    const playerProfile = await ethers.getContractAt("PlayerProfile", PLAYER_PROFILE_ADDRESS);
    const profileBaseURI = CORRECT_BASE_URIS.PLAYER_PROFILE;
    
    try {
      const tx = await playerProfile.setBaseURI(profileBaseURI);
      await tx.wait();
      console.log("✅ Player Profile baseURI 設定成功:", profileBaseURI);
    } catch (error) {
      console.log("❌ Player Profile baseURI 設定失敗:", error.message);
    }
  }

  // 設定 Hero baseURI
  if (HERO_ADDRESS) {
    console.log("\n3. 設定 Hero baseURI...");
    const hero = await ethers.getContractAt("Hero", HERO_ADDRESS);
    const heroBaseURI = CORRECT_BASE_URIS.HERO;
    
    try {
      const tx = await hero.setBaseURI(heroBaseURI);
      await tx.wait();
      console.log("✅ Hero baseURI 設定成功:", heroBaseURI);
    } catch (error) {
      console.log("❌ Hero baseURI 設定失敗:", error.message);
    }
  }

  // 設定 Relic baseURI
  if (RELIC_ADDRESS) {
    console.log("\n4. 設定 Relic baseURI...");
    const relic = await ethers.getContractAt("Relic", RELIC_ADDRESS);
    const relicBaseURI = CORRECT_BASE_URIS.RELIC;
    
    try {
      const tx = await relic.setBaseURI(relicBaseURI);
      await tx.wait();
      console.log("✅ Relic baseURI 設定成功:", relicBaseURI);
    } catch (error) {
      console.log("❌ Relic baseURI 設定失敗:", error.message);
    }
  }

  // 設定 Party baseURI
  if (PARTY_ADDRESS) {
    console.log("\n5. 設定 Party baseURI...");
    const party = await ethers.getContractAt("Party", PARTY_ADDRESS);
    const partyBaseURI = CORRECT_BASE_URIS.PARTY;
    
    try {
      const tx = await party.setBaseURI(partyBaseURI);
      await tx.wait();
      console.log("✅ Party baseURI 設定成功:", partyBaseURI);
    } catch (error) {
      console.log("❌ Party baseURI 設定失敗:", error.message);
    }
  }

  console.log("\n🎉 IPFS baseURI 修正完成！");
  console.log("\n📋 修正內容:");
  console.log("□ 每個 NFT 類型現在都有正確的子目錄路徑");
  console.log("□ Hero: ipfs://hash/hero/");
  console.log("□ Relic: ipfs://hash/relic/");
  console.log("□ Party: ipfs://hash/party/");
  console.log("□ VIP: ipfs://hash/vip/");
  console.log("□ Profile: ipfs://hash/profile/");
  
  console.log("\n🧪 測試建議:");
  console.log("1. 鑄造一個新的 NFT 測試 IPFS 載入");
  console.log("2. 檢查 NFT 市場是否能正確顯示");
  console.log("3. 驗證圖片和元數據是否正確載入");
  
  console.log("\n📝 下一步:");
  console.log("1. 上傳重新組織的 IPFS 文件結構");
  console.log("2. 測試前端 NFT 載入功能");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 