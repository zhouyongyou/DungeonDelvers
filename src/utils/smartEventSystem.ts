// src/utils/smartEventSystem.ts - 智能事件監聽系統
// 根據 RPC 節點能力自動選擇 Filter 或輪詢模式

import { createPublicClient, http, parseAbiItem } from 'viem';
import type { Log } from 'viem';
import { bsc } from 'viem/chains';
import { logger } from './logger';
import { getRpcEndpoint, markRpcOptimizedFailed } from './rpcOptimizedMigration';

interface EventConfig {
  address: `0x${string}`;
  event: string;
  callback: (logs: Log[]) => void;
  enabled: boolean;
}

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

type EventMode = 'filter' | 'polling' | 'unknown';

class SmartEventSystem {
  private client: any;
  private eventConfigs: Map<string, EventConfig> = new Map();
  private mode: EventMode = 'unknown';
  private filterIds: Map<string, string> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;
  private lastPolledBlock: bigint = 0n;
  private isActive = false;
  
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
   * 檢測 RPC 節點是否支援 Filter 方法
   */
  private async detectNodeCapabilities(): Promise<EventMode> {
    if (this.mode !== 'unknown') return this.mode;
    
    try {
      logger.info('🔍 檢測 RPC 節點能力...');
      
      // 嘗試創建一個測試 filter
      const testFilter = await this.client.createEventFilter({
        address: '0x0000000000000000000000000000000000000000', // 假地址
        event: parseEventSignature('event Transfer(indexed address, indexed address, uint256)'),
        fromBlock: 'latest'
      });
      
      // 如果能創建 filter，則支援 filter 模式
      if (testFilter) {
        // 清理測試 filter
        try {
          await this.client.uninstallFilter({ filter: testFilter });
        } catch (e) {
          // 忽略清理錯誤
        }
        
        this.mode = 'filter';
        logger.info('✅ RPC 節點支援 Filter 事件監聽（高效模式）');
        return 'filter';
      }
    } catch (error: any) {
      const errorMsg = error?.message?.toLowerCase() || '';
      
      if (errorMsg.includes('not supported') || 
          errorMsg.includes('not allowed') ||
          errorMsg.includes('method not found')) {
        this.mode = 'polling';
        logger.info('⚠️ RPC 節點不支援 Filter，使用區塊輪詢模式');
        return 'polling';
      }
      
      logger.warn('🤔 RPC 能力檢測失敗，默認使用輪詢模式:', error);
    }
    
    // 默認使用輪詢模式
    this.mode = 'polling';
    return 'polling';
  }
  
  /**
   * 註冊事件監聽
   */
  async registerEvent(
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
    
    // 檢測節點能力並啟動相應的監聽模式
    const mode = await this.detectNodeCapabilities();
    
    if (mode === 'filter') {
      await this.startFilterMode();
    } else {
      await this.startPollingMode();
    }
  }
  
  /**
   * 取消事件監聽
   */
  async unregisterEvent(eventId: string) {
    this.eventConfigs.delete(eventId);
    
    // 清理對應的 filter
    const filterId = this.filterIds.get(eventId);
    if (filterId && this.mode === 'filter') {
      try {
        await this.client.uninstallFilter({ filter: filterId });
        this.filterIds.delete(eventId);
      } catch (error) {
        logger.warn(`清理 Filter ${eventId} 失敗:`, error);
      }
    }
    
    logger.info(`🔇 取消事件監聽: ${eventId}`);
    
    // 如果沒有監聽的事件了，停止服務
    if (this.eventConfigs.size === 0) {
      this.stop();
    }
  }
  
  /**
   * 啟動 Filter 模式（高效）
   */
  private async startFilterMode() {
    if (this.isActive) return;
    
    this.isActive = true;
    logger.info('🚀 啟動 Filter 事件監聽模式');
    
    // 為每個事件創建 filter
    for (const [eventId, config] of this.eventConfigs) {
      if (!config.enabled) continue;
      
      try {
        const filter = await this.client.createEventFilter({
          address: config.address,
          event: parseEventSignature(config.event),
          fromBlock: 'latest'
        });
        
        this.filterIds.set(eventId, filter);
        logger.info(`✅ Filter 已創建: ${eventId}`);
      } catch (error) {
        logger.error(`Filter 創建失敗 ${eventId}:`, error);
        
        // 如果 filter 創建失敗，降級到輪詢模式
        logger.warn('🔄 降級到輪詢模式');
        this.mode = 'polling';
        await this.startPollingMode();
        return;
      }
    }
    
    // 開始輪詢 filter 變更（每10秒，避免 RPC 限流）
    this.pollingInterval = setInterval(() => {
      this.pollFilterChanges().catch(error => {
        logger.error('Filter 輪詢錯誤:', error);
        
        // 如果 filter 出錯，嘗試降級到區塊輪詢
        logger.warn('🔄 Filter 錯誤，降級到區塊輪詢');
        this.mode = 'polling';
        this.startPollingMode();
      });
    }, 10000); // 減少輪詢頻率避免 RPC 限流
  }
  
  /**
   * 輪詢 Filter 變更
   */
  private async pollFilterChanges() {
    for (const [eventId, filterId] of this.filterIds) {
      const config = this.eventConfigs.get(eventId);
      if (!config?.enabled) continue;
      
      try {
        const logs = await this.client.getFilterChanges({ filter: filterId });
        
        if (logs.length > 0) {
          logger.info(`📨 ${eventId} Filter 收到 ${logs.length} 個事件`);
          config.callback(logs);
        }
      } catch (error: any) {
        if (error?.message?.includes('filter not found')) {
          logger.warn(`Filter ${eventId} 不存在，重新創建...`);
          
          // 重新創建 filter
          try {
            const newFilter = await this.client.createEventFilter({
              address: config.address,
              event: parseEventSignature(config.event),
              fromBlock: 'latest'
            });
            this.filterIds.set(eventId, newFilter);
          } catch (recreateError) {
            logger.error(`重新創建 Filter ${eventId} 失敗:`, recreateError);
            throw recreateError;
          }
        } else if (error?.message?.includes('CONNECTION_CLOSED') || error?.message?.includes('fetch failed') || error?.code === 'NETWORK_ERROR') {
          // RPC 連接問題，標記 rpc-optimized 失敗並切換到輪詢模式
          logger.warn(`RPC 連接問題，從 Filter 模式切換到輪詢模式: ${error.message}`);
          markRpcOptimizedFailed(); // 標記失敗，下次會使用直接 Alchemy
          this.switchToPollingMode();
          return; // 不拋出錯誤，靜默切換
        } else {
          logger.error(`Filter 輪詢錯誤 (${eventId}):`, error);
          // 不拋出錯誤，繼續執行其他 filter
        }
      }
    }
  }
  
  /**
   * 啟動輪詢模式（兼容性好）
   */
  private async startPollingMode() {
    if (this.isActive && this.mode === 'polling') return;
    
    // 清理 filter 模式的資源
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    this.isActive = true;
    this.mode = 'polling';
    logger.info('🔄 啟動區塊輪詢事件監聽模式');
    
    // 獲取當前區塊號作為起始點
    try {
      this.lastPolledBlock = await this.client.getBlockNumber();
    } catch (error) {
      logger.error('獲取初始區塊號失敗:', error);
      this.lastPolledBlock = 0n;
    }
    
    // 每 15 秒輪詢一次（避免 RPC 限流）
    this.pollingInterval = setInterval(() => {
      this.pollBlocks().catch(error => {
        logger.error('區塊輪詢錯誤:', error);
      });
    }, 15000);
  }
  
  /**
   * 輪詢區塊事件
   */
  private async pollBlocks() {
    try {
      const currentBlock = await this.client.getBlockNumber();
      
      // 如果沒有新區塊，跳過
      if (currentBlock <= this.lastPolledBlock) {
        return;
      }
      
      const fromBlock = this.lastPolledBlock + 1n;
      const toBlock = currentBlock;
      
      // 批量處理事件以減少 RPC 請求
      const batchSize = 5; // 每批最多處理 5 個區塊
      const blockRange = toBlock - fromBlock;
      
      // 如果區塊範圍太大，分批處理
      if (blockRange > BigInt(batchSize)) {
        const batches = [];
        for (let i = fromBlock; i <= toBlock; i += BigInt(batchSize)) {
          const batchEnd = i + BigInt(batchSize) - 1n;
          batches.push({
            from: i,
            to: batchEnd > toBlock ? toBlock : batchEnd
          });
        }
        
        // 逐批處理，避免速率限制
        for (const batch of batches) {
          await this.processEventBatch(batch.from, batch.to);
          // 添加延遲避免速率限制
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        // 區塊範圍小，直接處理
        await this.processEventBatch(fromBlock, toBlock);
      }
      
      this.lastPolledBlock = currentBlock;
      
    } catch (error) {
      logger.error('區塊輪詢過程錯誤:', error);
      
      // 重新初始化客戶端
      this.initializeClient();
    }
  }
  
  /**
   * 處理一批區塊的事件
   */
  private async processEventBatch(fromBlock: bigint, toBlock: bigint) {
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
          logger.info(`📨 ${eventId} 區塊輪詢收到 ${logs.length} 個事件`);
          config.callback(logs);
        }
        
      } catch (error) {
        // 處理速率限制錯誤
        if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
          logger.warn(`${eventId} 遇到速率限制，延遲後重試...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 等待 1 秒
          
          // 重試一次
          try {
            const logs = await this.client.getLogs({
              address: config.address,
              event: parseEventSignature(config.event),
              fromBlock,
              toBlock,
            });
            
            if (logs.length > 0) {
              logger.info(`📨 ${eventId} 重試成功，收到 ${logs.length} 個事件`);
              config.callback(logs);
            }
          } catch (retryError) {
            logger.error(`事件 ${eventId} 重試失敗:`, retryError);
          }
        } else {
          logger.error(`事件 ${eventId} 區塊輪詢失敗:`, error);
          
          // 如果是 RPC 錯誤，重新初始化客戶端
          if (error.message?.includes('fetch') || error.message?.includes('network')) {
            this.initializeClient();
          }
        }
      }
    }
  }
  
  /**
   * 停止事件監聽
   */
  private stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // 清理輪詢
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // 清理所有 filters
    if (this.mode === 'filter') {
      this.filterIds.forEach(async (filterId, eventId) => {
        try {
          await this.client.uninstallFilter({ filter: filterId });
        } catch (error) {
          logger.warn(`清理 Filter ${eventId} 失敗:`, error);
        }
      });
      this.filterIds.clear();
    }
    
    logger.info('⏹️ 停止智能事件監聽系統');
  }
  
  /**
   * 切換到輪詢模式（當 Filter 模式失敗時）
   */
  private async switchToPollingMode() {
    if (this.mode === 'polling') return; // 已經是輪詢模式
    
    logger.info('🔄 由於 RPC 連接問題，切換到輪詢模式');
    
    // 清理 Filter 模式的資源
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    
    // 清理所有 filters
    this.filterIds.clear();
    
    // 切換模式並重新啟動
    this.mode = 'polling';
    await this.startPollingMode();
  }
  
  /**
   * 獲取當前狀態
   */
  getStatus() {
    return {
      mode: this.mode,
      isActive: this.isActive,
      lastPolledBlock: this.lastPolledBlock.toString(),
      registeredEvents: Array.from(this.eventConfigs.keys()),
      activeEvents: Array.from(this.eventConfigs.values()).filter(config => config.enabled).length,
      activeFilters: this.mode === 'filter' ? this.filterIds.size : 0
    };
  }
}

// 全局實例
export const smartEventSystem = new SmartEventSystem();

/**
 * Hook 風格的智能事件監聽
 */
export function useSmartEventListener(
  eventId: string,
  address: `0x${string}`,
  eventSignature: string,
  callback: (logs: Log[]) => void,
  enabled: boolean = true
) {
  if (enabled) {
    smartEventSystem.registerEvent(eventId, address, eventSignature, callback);
  } else {
    smartEventSystem.unregisterEvent(eventId);
  }
  
  return () => {
    smartEventSystem.unregisterEvent(eventId);
  };
}