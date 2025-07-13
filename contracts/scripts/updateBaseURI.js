const { ethers } = require("hardhat");

async function main() {
  // Render.com 部署的 metadata API URL
  const NEW_BASE_URI = "https://dungeondelvers-metadata.onrender.com/api/metadata/";
  
  // 合約地址
  const contracts = {
    Hero: "0x你的Hero合約地址",
    Relic: "0x你的Relic合約地址", 
    Party: "0x你的Party合約地址",
    VIP: "0x你的VIP合約地址"
  };

  console.log("開始更新 BaseURI...");
  
  for (const [name, address] of Object.entries(contracts)) {
    if (address.startsWith("0x你的")) {
      console.log(`⚠️  請先更新 ${name} 合約地址`);
      continue;
    }
    
    try {
      const Contract = await ethers.getContractFactory(name);
      const contract = Contract.attach(address);
      
      // 更新 BaseURI
      const tx = await contract.setBaseURI(NEW_BASE_URI);
      console.log(`✅ ${name} BaseURI 更新交易: ${tx.hash}`);
      
      // 等待交易確認
      await tx.wait();
      console.log(`✅ ${name} BaseURI 已更新為: ${NEW_BASE_URI}`);
      
    } catch (error) {
      console.error(`❌ ${name} 更新失敗:`, error.message);
    }
  }
  
  console.log("\n✅ 所有合約 BaseURI 更新完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });