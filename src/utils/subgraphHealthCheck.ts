// src/utils/subgraphHealthCheck.ts - 子圖健康檢查工具

import { logger } from './logger';
import { getApiKey } from '../config/subgraph';

interface SubgraphHealthStatus {
  isHealthy: boolean;
  lastSyncBlock: number;
  currentBlock: number;
  syncLag: number;
  lastUpdate: string;
  errors: string[];
}

/**
 * 檢查子圖健康狀態
 */
export async function checkSubgraphHealth(): Promise<SubgraphHealthStatus> {
  const status: SubgraphHealthStatus = {
    isHealthy: false,
    lastSyncBlock: 0,
    currentBlock: 0,
    syncLag: 0,
    lastUpdate: '',
    errors: []
  };

  try {
    // 獲取當前區塊高度
    const rpcResponse = await fetch('https://bsc-dataseed1.binance.org/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1,
      }),
    });

    if (rpcResponse.ok) {
      const rpcData = await rpcResponse.json();
      status.currentBlock = parseInt(rpcData.result, 16);
    }

    // 檢查子圖狀態
    const subgraphQuery = `
      query {
        _meta {
          block {
            number
            timestamp
          }
          hasIndexingErrors
        }
      }
    `;

    const apiKey = getApiKey();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    // 如果有 API key，添加到 Authorization header
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const subgraphResponse = await fetch('https://gateway.thegraph.com/api/f6c1aba78203cfdf0cc732eafe677bdd/subgraphs/id/Hmwr7XYgzVzsUb9dw95gSGJ1Vof6qYypuvCxynzinCjs', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: subgraphQuery }),
    });

    if (subgraphResponse.ok) {
      const subgraphData = await subgraphResponse.json();
      
      if (subgraphData.data?._meta) {
        const meta = subgraphData.data._meta;
        status.lastSyncBlock = meta.block.number;
        status.lastUpdate = new Date(meta.block.timestamp * 1000).toISOString();
        status.syncLag = status.currentBlock - status.lastSyncBlock;
        
        // 子圖被認為是健康的，如果：
        // 1. 沒有索引錯誤
        // 2. 同步延遲小於 100 個區塊（約 5 分鐘）
        status.isHealthy = !meta.hasIndexingErrors && status.syncLag < 100;
        
        if (meta.hasIndexingErrors) {
          status.errors.push('子圖存在索引錯誤');
        }
        
        if (status.syncLag >= 100) {
          status.errors.push(`子圖同步延遲過大: ${status.syncLag} 個區塊`);
        }
      } else {
        status.errors.push('無法獲取子圖元數據');
      }
    } else {
      status.errors.push('子圖 API 無法訪問');
    }

  } catch (error) {
    status.errors.push(`健康檢查失敗: ${error.message}`);
    logger.error('子圖健康檢查失敗:', error);
  }

  return status;
}

/**
 * 顯示子圖健康狀態報告
 */
export async function showSubgraphHealthReport(): Promise<void> {
  logger.info('🔍 執行子圖健康檢查...');
  
  const status = await checkSubgraphHealth();
  
  if (status.isHealthy) {
    logger.info('✅ 子圖狀態健康', {
      currentBlock: status.currentBlock,
      lastSyncBlock: status.lastSyncBlock,
      syncLag: status.syncLag,
      lastUpdate: status.lastUpdate
    });
  } else {
    logger.warn('⚠️ 子圖狀態異常', {
      errors: status.errors,
      currentBlock: status.currentBlock,
      lastSyncBlock: status.lastSyncBlock,
      syncLag: status.syncLag,
      lastUpdate: status.lastUpdate
    });
    
    // 在控制台顯示用戶友好的錯誤信息
    console.group('🔍 子圖狀態診斷');
    console.log('當前區塊:', status.currentBlock);
    console.log('子圖最後同步區塊:', status.lastSyncBlock);
    console.log('同步延遲:', status.syncLag, '個區塊');
    console.log('最後更新時間:', status.lastUpdate);
    console.log('錯誤列表:', status.errors);
    console.groupEnd();
  }
}

/**
 * 等待子圖同步到指定區塊
 */
export async function waitForSubgraphSync(
  targetBlock: number, 
  timeoutMs: number = 60000
): Promise<boolean> {
  const startTime = Date.now();
  
  logger.info(`⏳ 等待子圖同步到區塊 ${targetBlock}...`);
  
  while (Date.now() - startTime < timeoutMs) {
    const status = await checkSubgraphHealth();
    
    if (status.lastSyncBlock >= targetBlock) {
      logger.info(`✅ 子圖已同步到區塊 ${status.lastSyncBlock}`);
      return true;
    }
    
    // 每 3 秒檢查一次
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  logger.warn(`⏰ 等待子圖同步超時 (${timeoutMs}ms)`);
  return false;
}

/**
 * 建議用戶的下一步操作
 */
export function getSubgraphTroubleshootingSteps(status: SubgraphHealthStatus): string[] {
  const steps: string[] = [];
  
  if (!status.isHealthy) {
    steps.push('🔄 嘗試刷新頁面 (F5 或 Ctrl+R)');
    
    if (status.syncLag > 50) {
      steps.push('⏳ 子圖同步延遲，請等待 5-10 分鐘後再試');
    }
    
    if (status.errors.includes('子圖 API 無法訪問')) {
      steps.push('🌐 檢查網路連接，或稍後再試');
    }
    
    if (status.errors.includes('子圖存在索引錯誤')) {
      steps.push('🛠️ 子圖服務暫時不穩定，請聯繫技術支援');
    }
    
    steps.push('📱 您也可以直接在區塊鏈瀏覽器上確認交易狀態');
    steps.push('💡 如果問題持續，請加入我們的 Discord 社群尋求幫助');
  }
  
  return steps;
}

// 將檢查函數暴露到全域，方便調試
if (typeof window !== 'undefined') {
  (window as any).checkSubgraphHealth = checkSubgraphHealth;
  (window as any).showSubgraphHealthReport = showSubgraphHealthReport;
}