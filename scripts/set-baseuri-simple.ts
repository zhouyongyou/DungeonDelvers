// scripts/set-baseuri-simple.ts
// 簡化版本的 BaseURI 設定腳本 - 可從前端項目運行

import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// 讀取共享配置
const configPath = path.join(__dirname, '../shared-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// 合約地址 - 從 shared-config.json 讀取
const CONTRACT_ADDRESSES = {
  HERO: config.contracts.hero,
  RELIC: config.contracts.relic,
  PARTY: config.contracts.party,
  VIP_STAKING: config.contracts.vipStaking,
  PLAYER_PROFILE: config.contracts.playerProfile,
};

// 支援的 BaseURI 類型
type BaseURIType = 'api' | 'ipfs';

// 環境配置
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// BaseURI 配置
const BASE_URI_CONFIG = {
  api: {
    development: "http://localhost:3001/api/metadata/",
    production: "https://dungeondelvers-metadata-api.onrender.com/api/metadata/"
  },
  ipfs: {
    // 更新的 IPFS 哈希 - 如果你有新的 IPFS 部署，請更新這個
    baseHash: "bafybeiagvaba3iswugci4e45tnucrerh32retgukatdx3v6p6wpupkwphm",
    gateway: "ipfs://"
  }
};

// 簡化的 ABI - 只包含需要的函數
const SIMPLE_ABI = [
  "function baseURI() view returns (string)",
  "function setBaseURI(string memory newBaseURI) external",
  "function owner() view returns (address)"
];

// 生成 BaseURI
function generateBaseURI(type: BaseURIType, contractType: string): string {
  if (type === 'api') {
    const baseUrl = BASE_URI_CONFIG.api[ENVIRONMENT as keyof typeof BASE_URI_CONFIG.api];
    return `${baseUrl}${contractType}/`;
  } else {
    const { baseHash, gateway } = BASE_URI_CONFIG.ipfs;
    return `${gateway}${baseHash}/${contractType}/`;
  }
}

// 更新單個合約的 BaseURI
async function updateContractBaseURI(
  contractName: string,
  contractAddress: string,
  contractType: string,
  baseURIType: BaseURIType,
  signer: ethers.Signer
) {
  try {
    console.log(`\n📝 正在更新 ${contractName} 合約的 BaseURI...`);
    
    const contract = new ethers.Contract(contractAddress, SIMPLE_ABI, signer);
    
    // 檢查當前 BaseURI
    const currentBaseURI = await contract.baseURI();
    console.log(`  > 當前 BaseURI: ${currentBaseURI}`);
    
    // 生成新的 BaseURI
    const newBaseURI = generateBaseURI(baseURIType, contractType);
    console.log(`  > 設定新的 BaseURI: ${newBaseURI}`);
    
    // 如果 BaseURI 相同，跳過更新
    if (currentBaseURI === newBaseURI) {
      console.log(`  ⏭️  BaseURI 已經是最新版本，跳過更新`);
      return;
    }
    
    // 更新 BaseURI
    const tx = await contract.setBaseURI(newBaseURI);
    console.log(`  ⏳ 交易已提交，等待確認...`);
    
    const receipt = await tx.wait();
    console.log(`  ✅ ${contractName} BaseURI 更新成功！`);
    console.log(`  > 交易哈希: ${receipt.hash}`);
    
  } catch (error: any) {
    console.log(`  ❌ ${contractName} BaseURI 更新失敗: ${error.message}`);
  }
}

// 主要函數
async function main() {
  // 從命令行參數獲取 BaseURI 類型
  const baseURIType = (process.argv[2] as BaseURIType) || 'api';
  
  if (!['api', 'ipfs'].includes(baseURIType)) {
    console.error('❌ 無效的 BaseURI 類型。請使用 "api" 或 "ipfs"');
    process.exit(1);
  }
  
  console.log(`🔧 開始設定 ${baseURIType.toUpperCase()} BaseURI...`);
  console.log(`📍 環境: ${ENVIRONMENT}`);
  
  // 設定 RPC 提供者
  const rpcUrl = config.network.rpcUrl;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // 從環境變數獲取私鑰
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('❌ 請設定 PRIVATE_KEY 環境變數');
    process.exit(1);
  }
  
  const signer = new ethers.Wallet(privateKey, provider);
  console.log(`👤 部署者錢包: ${signer.address}`);
  
  if (baseURIType === 'api') {
    const apiBaseUrl = BASE_URI_CONFIG.api[ENVIRONMENT as keyof typeof BASE_URI_CONFIG.api];
    console.log(`🌐 API 基礎 URL: ${apiBaseUrl}`);
  } else {
    const { baseHash } = BASE_URI_CONFIG.ipfs;
    console.log(`📁 IPFS 哈希: ${baseHash}`);
  }
  
  // 更新所有合約的 BaseURI
  const contractUpdates = [
    { name: 'Hero', address: CONTRACT_ADDRESSES.HERO, type: 'hero' },
    { name: 'Relic', address: CONTRACT_ADDRESSES.RELIC, type: 'relic' },
    { name: 'Party', address: CONTRACT_ADDRESSES.PARTY, type: 'party' },
    { name: 'VIPStaking', address: CONTRACT_ADDRESSES.VIP_STAKING, type: 'vip' },
    { name: 'PlayerProfile', address: CONTRACT_ADDRESSES.PLAYER_PROFILE, type: 'profile' },
  ];
  
  for (const { name, address, type } of contractUpdates) {
    if (address && address !== '0x0000000000000000000000000000000000000000') {
      await updateContractBaseURI(name, address, type, baseURIType, signer);
    } else {
      console.log(`⚠️  跳過 ${name} 合約 - 地址未設定`);
    }
  }
  
  console.log(`\n🎉 BaseURI 更新完成！`);
  
  // 顯示更新摘要
  console.log(`\n📋 更新摘要:`);
  console.log(`□ BaseURI 類型: ${baseURIType.toUpperCase()}`);
  console.log(`□ 環境: ${ENVIRONMENT}`);
  
  if (baseURIType === 'api') {
    console.log(`□ 所有 NFT 現在使用後端 API 端點`);
    console.log(`□ 支援動態元數據和市場數據整合`);
    console.log(`□ 自動快取和效能優化`);
  } else {
    console.log(`□ 所有 NFT 現在使用 IPFS 去中心化儲存`);
    console.log(`□ 永久儲存和完全去中心化`);
    console.log(`□ 不依賴外部服務`);
  }
  
  console.log(`\n🧪 測試建議:`);
  console.log(`1. 檢查 NFT 元數據是否正確載入`);
  console.log(`2. 測試前端 NFT 顯示功能`);
  console.log(`3. 驗證 NFT 市場顯示是否正常`);
  
  if (baseURIType === 'api') {
    console.log(`4. 確認後端服務正在運行`);
    console.log(`5. 測試 API 端點響應時間`);
  }
}

// 錯誤處理
main()
  .then(() => {
    console.log('\n✨ 腳本執行完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 腳本執行失敗:', error);
    process.exit(1);
  }); 