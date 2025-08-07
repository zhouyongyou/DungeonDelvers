// 在瀏覽器控制台運行此代碼來診斷合約讀取問題

console.log('🔍 合約診斷工具');
console.log('===============');

// 檢查合約配置
import { CONTRACTS } from '../config/contracts.js';
import { getContractWithABI } from '../config/contractsWithABI.js';

console.log('1. 合約地址檢查:');
console.log('HERO:', CONTRACTS[56].HERO);
console.log('VRFMANAGER:', CONTRACTS[56].VRFMANAGER);

// 檢查 contractsWithABI
const heroContract = getContractWithABI('HERO');
const vrfManagerContract = getContractWithABI('VRFMANAGER');

console.log('\n2. 合約配置檢查:');
console.log('Hero Contract:', heroContract?.address);
console.log('VRF Manager Contract:', vrfManagerContract?.address);

// 檢查 ABI 中是否包含需要的函數
console.log('\n3. ABI 函數檢查:');
if (heroContract?.abi) {
  const platformFeeFn = heroContract.abi.find(fn => fn.name === 'platformFee');
  console.log('Hero platformFee() 函數:', platformFeeFn ? '✅ 存在' : '❌ 不存在');
}

if (vrfManagerContract?.abi) {
  const vrfRequestPriceFn = vrfManagerContract.abi.find(fn => fn.name === 'vrfRequestPrice');
  console.log('VRF vrfRequestPrice() 函數:', vrfRequestPriceFn ? '✅ 存在' : '❌ 不存在');
}

console.log('\n4. 建議檢查項目:');
console.log('- 確認 wagmi 連接到正確的網路 (BSC Mainnet, Chain ID 56)');
console.log('- 檢查瀏覽器 Network 標籤是否有 RPC 錯誤');
console.log('- 檢查合約地址是否正確部署在 BSC 主網');
console.log('- 確認 ABI 文件是否是最新版本');