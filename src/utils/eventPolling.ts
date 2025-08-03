// src/utils/eventPolling.ts - 替代 Filter 的事件輪詢系統

import { createPublicClient, http, parseAbiItem } from 'viem';
import type { Log } from 'viem';
import { bsc } from 'viem/chains';
import { logger } from './logger';
import { getRpcEndpoint } from './rpcOptimizedMigration';

// 手動解析事件簽名，避免 parseAbiItem 的 bug
function parseEventSignature(eventString: string) {
  // 解析 "event ExpeditionFulfilled(indexed address, indexed uint256, bool, uint256, uint256)"
  const match = eventString.match(/event\s+(\w+)\(([^)]+)\)/);
  if (!match) {
    throw new Error(`Invalid event signature: ${eventString}`);
  }
  
  const [, name, paramsString] = match;
  const params = paramsString.split(',').map(param => {
    const trimmed = param.trim();
    const isIndexed = trimmed.startsWith('indexed ');
    const type = isIndexed ? trimmed.substring(8).trim() : trimmed;
    
    return {
      type,
      indexed: isIndexed,
      name: '' // viem 不需要參數名稱
    };
  });
  
  return {
    name,
    type: 'event' as const,
    inputs: params
  };
}

// 事件監聽配置
interface EventConfig {
  address: `0x${string}`;
  event: string;
  callback: (logs: Log[]) => void;
  enabled: boolean;
}

class EventPollingService {
  private client: any;
  private eventConfigs: Map<string, EventConfig> = new Map();
  private lastPolledBlock: bigint = 0n;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;
  
  constructor() {
    this.initializeClient();
  }
  
  private initializeClient() {
    const rpcUrl = getRpcEndpoint();
    this.client = createPublicClient({
      chain: bsc,
      transport: http(rpcUrl, {
        batch: true,
        fetchOptions: {
          timeout: 10000,
        },
      }),
    });
  }
  
  /**
   * 註冊事件監聽
   */
  registerEvent(
    eventId: string,
    address: `0x${string}`,
    eventSignature: string,
    callback: (logs: Log[]) => void
  ) {
    this.eventConfigs.set(eventId, {
      address,
      event: eventSignature,
      callback,
      enabled: true,
    });
    
    logger.info(`📡 註冊事件監聽: ${eventId} at ${address}`);
    
    // 如果還沒開始輪詢，啟動輪詢
    if (!this.isPolling) {
      this.startPolling();
    }
  }
  
  /**
   * 取消事件監聽
   */
  unregisterEvent(eventId: string) {
    this.eventConfigs.delete(eventId);
    logger.info(`🔇 取消事件監聽: ${eventId}`);
    
    // 如果沒有監聽的事件了，停止輪詢
    if (this.eventConfigs.size === 0) {
      this.stopPolling();
    }
  }
  
  /**
   * 啟動輪詢
   */
  private async startPolling() {
    if (this.isPolling) return;
    
    this.isPolling = true;
    logger.info('🔄 啟動事件輪詢服務');
    
    // 獲取當前區塊號作為起始點
    try {
      this.lastPolledBlock = await this.client.getBlockNumber();
    } catch (error) {
      logger.error('獲取初始區塊號失敗:', error);
      this.lastPolledBlock = 0n;
    }
    
    // 每 3 秒輪詢一次
    this.pollingInterval = setInterval(() => {
      this.pollEvents().catch(error => {
        logger.error('事件輪詢錯誤:', error);
      });
    }, 3000);
  }
  
  /**
   * 停止輪詢
   */
  private stopPolling() {
    if (!this.isPolling) return;
    
    this.isPolling = false;
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    logger.info('⏹️ 停止事件輪詢服務');
  }
  
  /**
   * 輪詢事件
   */
  private async pollEvents() {
    try {
      const currentBlock = await this.client.getBlockNumber();
      
      // 如果沒有新區塊，跳過
      if (currentBlock <= this.lastPolledBlock) {
        return;
      }
      
      const fromBlock = this.lastPolledBlock + 1n;
      const toBlock = currentBlock;
      
      // 為每個事件配置獲取 logs
      for (const [eventId, config] of this.eventConfigs) {
        if (!config.enabled) continue;
        
        try {
          const logs = await this.client.getLogs({
            address: config.address,
            event: parseEventSignature(config.event),
            fromBlock,
            toBlock,
          });
          
          if (logs.length > 0) {
            logger.info(`📨 ${eventId} 收到 ${logs.length} 個事件`);
            config.callback(logs);
          }
          
        } catch (error) {
          logger.error(`事件 ${eventId} 獲取失敗:`, error);
          
          // 如果是 RPC 錯誤，重新初始化客戶端
          if (error.message?.includes('fetch') || error.message?.includes('network')) {
            this.initializeClient();
          }
        }
      }
      
      this.lastPolledBlock = currentBlock;
      
    } catch (error) {
      logger.error('輪詢過程錯誤:', error);
      
      // 重新初始化客戶端
      this.initializeClient();
    }
  }
  
  /**
   * 獲取狀態
   */
  getStatus() {
    return {
      isPolling: this.isPolling,
      lastPolledBlock: this.lastPolledBlock.toString(),
      registeredEvents: Array.from(this.eventConfigs.keys()),
      activeEvents: Array.from(this.eventConfigs.values()).filter(config => config.enabled).length,
    };
  }
}

// 全局實例
export const eventPollingService = new EventPollingService();

/**
 * Hook 風格的事件監聽
 */
export function useEventPolling(
  eventId: string,
  address: `0x${string}`,
  eventSignature: string,
  callback: (logs: Log[]) => void,
  enabled: boolean = true
) {
  if (enabled) {
    eventPollingService.registerEvent(eventId, address, eventSignature, callback);
  } else {
    eventPollingService.unregisterEvent(eventId);
  }
  
  return () => {
    eventPollingService.unregisterEvent(eventId);
  };
}