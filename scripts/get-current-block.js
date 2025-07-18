// 獲取當前 BSC 區塊號
import { ethers } from 'ethers';

async function getCurrentBlock() {
  const provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org/');
  const blockNumber = await provider.getBlockNumber();
  console.log('當前 BSC 區塊號:', blockNumber);
  console.log('建議使用區塊號:', blockNumber - 10); // 往前10個區塊，確保穩定
  return blockNumber;
}

getCurrentBlock().catch(console.error);