import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

// 【除錯】加入此行來確認 hardhat.config.ts 是否被成功讀取
console.log("✅ hardhat.config.ts 檔案已成功讀取！優化器和 viaIR 設定應會生效。");

const privateKey = process.env.PRIVATE_KEY || "";
const bscscanApiKey = process.env.BSCSCAN_API_KEY || "";
const bscTestnetRpcUrl = process.env.BSC_TESTNET_RPC_URL || "https://data-seed-prebsc-1-s1.binance.org:8545/";

if (!privateKey) {
  console.warn("⚠️ 警告：找不到 PRIVATE_KEY，請在 .env 檔案中設定。");
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        // 【修正】將 runs 調整為一個更標準的值，以平衡部署和執行成本
        runs: 200, 
      },
      viaIR: true,
    },
  },
  networks: {
    bscTestnet: {
      url: bscTestnetRpcUrl,
      chainId: 97,
      accounts: privateKey !== '' ? [privateKey] : [],
      gas: 30000000, 
    },
    hardhat: {
        blockGasLimit: 30000000,
        allowUnlimitedContractSize: true
    }
  },
  etherscan: {
    apiKey: {
      bscTestnet: bscscanApiKey,
      bsc: bscscanApiKey,
    },
  },
};

export default config;
