// src/utils/eventThrottler.ts - 事件節流工具，減少RPC請求頻率

interface ThrottledEvent {
  callback: () => void;
  delay: number;
  timer: NodeJS.Timeout | null;
  lastExecution: number;
}

/**
 * 全局事件節流管理器
 * 用於統一管理事件監聽器的節流，減少不必要的RPC請求
 */
class EventThrottleManager {
  private events = new Map<string, ThrottledEvent>();

  /**
   * 創建節流化的事件處理器
   * @param eventId 事件唯一標識
   * @param callback 回調函數
   * @param delay 節流延遲（毫秒）
   * @param minInterval 最小執行間隔（毫秒）
   */
  createThrottledHandler(
    eventId: string, 
    callback: () => void, 
    delay: number = 1000,
    minInterval: number = 5000
  ): () => void {
    const existingEvent = this.events.get(eventId);
    if (existingEvent) {
      if (existingEvent.timer) {
        clearTimeout(existingEvent.timer);
      }
    }

    const throttledEvent: ThrottledEvent = {
      callback,
      delay,
      timer: null,
      lastExecution: 0,
    };

    this.events.set(eventId, throttledEvent);

    return () => {
      const now = Date.now();
      const event = this.events.get(eventId);
      if (!event) return;

      // 檢查最小間隔
      if (now - event.lastExecution < minInterval) {
        return;
      }

      // 清除現有定時器
      if (event.timer) {
        clearTimeout(event.timer);
      }

      // 設置新的節流定時器
      event.timer = setTimeout(() => {
        event.lastExecution = Date.now();
        event.callback();
        event.timer = null;
      }, delay);
    };
  }

  /**
   * 清理特定事件的節流器
   */
  clearEvent(eventId: string): void {
    const event = this.events.get(eventId);
    if (event?.timer) {
      clearTimeout(event.timer);
    }
    this.events.delete(eventId);
  }

  /**
   * 清理所有事件節流器
   */
  clearAll(): void {
    this.events.forEach(event => {
      if (event.timer) {
        clearTimeout(event.timer);
      }
    });
    this.events.clear();
  }

  /**
   * 獲取當前活動的事件數量
   */
  getActiveEventCount(): number {
    return Array.from(this.events.values()).filter(event => event.timer !== null).length;
  }

  /**
   * 立即執行特定事件（忽略節流）
   */
  executeImmediately(eventId: string): void {
    const event = this.events.get(eventId);
    if (event) {
      if (event.timer) {
        clearTimeout(event.timer);
        event.timer = null;
      }
      event.lastExecution = Date.now();
      event.callback();
    }
  }
}

// 全局實例
export const eventThrottler = new EventThrottleManager();

/**
 * React Hook：創建節流化的事件處理器
 */
export function useThrottledEventHandler(
  eventId: string,
  callback: () => void,
  delay: number = 1000,
  minInterval: number = 5000
) {
  const handler = eventThrottler.createThrottledHandler(eventId, callback, delay, minInterval);
  
  // 清理函數
  const cleanup = () => eventThrottler.clearEvent(eventId);
  
  return { handler, cleanup };
}

/**
 * 創建智能的RPC請求節流器
 * 專門用於減少區塊鏈相關的請求頻率
 */
export function createRpcThrottler(
  operationType: 'read' | 'write' | 'event',
  priority: 'high' | 'medium' | 'low' = 'medium'
) {
  const delayMap = {
    read: { high: 500, medium: 1500, low: 3000 },
    write: { high: 1000, medium: 2000, low: 5000 },
    event: { high: 2000, medium: 5000, low: 10000 },
  };

  const minIntervalMap = {
    read: { high: 2000, medium: 5000, low: 10000 },
    write: { high: 3000, medium: 8000, low: 15000 },
    event: { high: 5000, medium: 10000, low: 20000 },
  };

  return {
    delay: delayMap[operationType][priority],
    minInterval: minIntervalMap[operationType][priority],
  };
}

// 在頁面卸載時清理所有節流器
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    eventThrottler.clearAll();
  });
}