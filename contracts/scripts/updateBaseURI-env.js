const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
  // Render.com 部署的 metadata API URL
  const NEW_BASE_URI = process.env.METADATA_API_URL || "https://dungeondelvers-metadata.onrender.com/api/metadata/";
  
  // 從環境變量讀取合約地址
  const contracts = {
    Hero: process.env.VITE_MAINNET_HERO_ADDRESS || "0x2a046140668cBb8F598ff3852B08852A8EB23b6a",
    Relic: process.env.VITE_MAINNET_RELIC_ADDRESS || "0x95F005e2e0d38381576DA36c5CA4619a87da550E",
    Party: process.env.VITE_MAINNET_PARTY_ADDRESS || "0x11FB68409222B53b04626d382d7e691e640A1DcD",
    VIPStaking: process.env.VITE_MAINNET_VIPSTAKING_ADDRESS || "0xefdfF583944A2c6318d1597AD1E41159fCd8F6dB"
  };

  console.log("開始更新 BaseURI...");
  console.log(`新的 BaseURI: ${NEW_BASE_URI}`);
  console.log("------------------------");
  
  for (const [name, address] of Object.entries(contracts)) {
    try {
      console.log(`\n處理 ${name} 合約...`);
      console.log(`地址: ${address}`);
      
      // 根據合約名稱獲取正確的合約工廠
      const contractName = name === "VIPStaking" ? "VIPStaking" : name;
      const Contract = await ethers.getContractFactory(contractName);
      const contract = Contract.attach(address);
      
      // 檢查是否有 setBaseURI 函數
      if (typeof contract.setBaseURI === 'function') {
        // 更新 BaseURI
        const tx = await contract.setBaseURI(NEW_BASE_URI);
        console.log(`✅ ${name} BaseURI 更新交易已發送: ${tx.hash}`);
        
        // 等待交易確認
        const receipt = await tx.wait();
        console.log(`✅ ${name} BaseURI 已更新！Gas used: ${receipt.gasUsed.toString()}`);
        
        // 驗證更新
        if (typeof contract.baseURI === 'function') {
          const currentBaseURI = await contract.baseURI();
          console.log(`✅ ${name} 當前 BaseURI: ${currentBaseURI}`);
        }
      } else {
        console.log(`⚠️  ${name} 合約沒有 setBaseURI 函數`);
      }
      
    } catch (error) {
      console.error(`❌ ${name} 更新失敗:`, error.message);
    }
  }
  
  console.log("\n------------------------");
  console.log("✅ BaseURI 更新流程完成！");
  console.log("\n注意事項:");
  console.log("1. 確保 Render.com 上的 metadata API 正在運行");
  console.log("2. 測試 metadata API 是否正常返回數據");
  console.log("3. 清除 NFT 市場的快取可能需要一些時間");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });