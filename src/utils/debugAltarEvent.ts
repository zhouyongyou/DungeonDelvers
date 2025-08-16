// 調試工具：分析祭壇升級事件
import { decodeEventLog } from 'viem';
import altarOfAscensionABI from '../contracts/abi/AltarOfAscension.json';

export function debugAltarTransaction(receipt: any, altarContractAddress: string) {
  console.log('=== 祭壇交易調試信息 ===');
  console.log('交易收據:', receipt);
  console.log('祭壇合約地址:', altarContractAddress);
  
  // 找出所有來自祭壇合約的日誌
  const altarLogs = receipt.logs.filter((log: any) => 
    log.address.toLowerCase() === altarContractAddress.toLowerCase()
  );
  
  console.log(`找到 ${altarLogs.length} 個來自祭壇合約的日誌`);
  
  // 嘗試解碼每個日誌
  altarLogs.forEach((log: any, index: number) => {
    console.log(`\n--- 日誌 #${index + 1} ---`);
    console.log('原始日誌:', log);
    
    try {
      const decoded = decodeEventLog({ 
        abi: altarOfAscensionABI, 
        data: log.data,
        topics: log.topics 
      });
      console.log('解碼成功:');
      console.log('事件名稱:', decoded.eventName);
      console.log('事件參數:', decoded.args);
    } catch (error) {
      console.log('解碼失敗:', error);
    }
  });
  
  console.log('=== 調試結束 ===');
}

// 修復建議
export function findUpgradeAttemptedEvent(receipt: any, altarContractAddress: string) {
  const altarLogs = receipt.logs.filter((log: any) => 
    log.address.toLowerCase() === altarContractAddress.toLowerCase()
  );
  
  for (const log of altarLogs) {
    try {
      const decoded = decodeEventLog({ 
        abi: altarOfAscensionABI,
        data: log.data,
        topics: log.topics
      });
      
      if (decoded.eventName === 'UpgradeAttempted') {
        return { log, decoded };
      }
    } catch (error) {
      // 忽略解碼錯誤，繼續下一個
      continue;
    }
  }
  
  return null;
}