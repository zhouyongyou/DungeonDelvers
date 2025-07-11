// scripts/set-baseuri.js
// 設定所有合約的 baseURI

const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 開始設定 baseURI...");

  // 讀取環境變數
  const VIP_STAKING_ADDRESS = process.env.VITE_MAINNET_VIPSTAKING_ADDRESS;
  const PLAYER_PROFILE_ADDRESS = process.env.VITE_MAINNET_PLAYERPROFILE_ADDRESS;
  const HERO_ADDRESS = process.env.VITE_MAINNET_HERO_ADDRESS;
  const RELIC_ADDRESS = process.env.VITE_MAINNET_RELIC_ADDRESS;
  const PARTY_ADDRESS = process.env.VITE_MAINNET_PARTY_ADDRESS;

  // Metadata server 的 base URI
  const METADATA_BASE_URI = "https://dungeon-delvers-metadata-server.onrender.com/api/";

  const [deployer] = await ethers.getSigners();
  console.log("使用帳戶:", deployer.address);

  // 設定 VIP Staking baseURI
  if (VIP_STAKING_ADDRESS) {
    console.log("\n1. 設定 VIP Staking baseURI...");
    const vipStaking = await ethers.getContractAt("VIPStaking", VIP_STAKING_ADDRESS);
    const vipBaseURI = METADATA_BASE_URI + "vipstaking/";
    
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
    const profileBaseURI = METADATA_BASE_URI + "playerprofile/";
    
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
    const heroBaseURI = METADATA_BASE_URI + "hero/";
    
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
    const relicBaseURI = METADATA_BASE_URI + "relic/";
    
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
    const partyBaseURI = METADATA_BASE_URI + "party/";
    
    try {
      const tx = await party.setBaseURI(partyBaseURI);
      await tx.wait();
      console.log("✅ Party baseURI 設定成功:", partyBaseURI);
    } catch (error) {
      console.log("❌ Party baseURI 設定失敗:", error.message);
    }
  }

  console.log("\n🎉 baseURI 設定完成！");
  console.log("\n📋 驗證清單:");
  console.log("□ VIP Staking baseURI 已設定");
  console.log("□ Player Profile baseURI 已設定");
  console.log("□ Hero baseURI 已設定");
  console.log("□ Relic baseURI 已設定");
  console.log("□ Party baseURI 已設定");
  
  console.log("\n🧪 測試建議:");
  console.log("1. 使用 SVG 預覽頁面測試各 NFT 類型");
  console.log("2. 檢查 NFT 市場是否能正確顯示");
  console.log("3. 驗證 metadata 回傳正確的資料");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 