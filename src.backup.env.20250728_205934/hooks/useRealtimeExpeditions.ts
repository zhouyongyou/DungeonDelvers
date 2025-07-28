// useRealtimeExpeditions.ts - 即時遠征結果通知

import { useSubscription } from '@apollo/client';
import { PLAYER_EXPEDITIONS_SUBSCRIPTION } from '../graphql/subscriptions';
import { useAppToast } from '../contexts/SimpleToastContext';
import { formatEther } from 'viem';
import { useEffect, useRef } from 'react';
import { logger } from '../utils/logger';

interface UseRealtimeExpeditionsOptions {
  playerAddress: string;
  onNewExpedition?: (expedition: any) => void;
  showNotifications?: boolean;
}

export function useRealtimeExpeditions({
  playerAddress,
  onNewExpedition,
  showNotifications = true,
}: UseRealtimeExpeditionsOptions) {
  const { showToast } = useAppToast();
  const lastTimestampRef = useRef<string>(Math.floor(Date.now() / 1000).toString());
  
  // 暫時禁用訂閱 - The Graph Studio 不支援 WebSocket
  // TODO: 當遷移到去中心化網路時重新啟用
  const data = null;
  const loading = false;
  const error = null;
  
  /* 原始訂閱代碼 - 保留供未來使用
  const { data, loading, error } = useSubscription(
    PLAYER_EXPEDITIONS_SUBSCRIPTION,
    {
      variables: {
        player: playerAddress.toLowerCase(),
        timestamp: lastTimestampRef.current,
      },
      skip: !playerAddress,
      onError: (err) => {
        logger.error('Expedition subscription error:', err);
      },
      onData: ({ data }) => {
        const expedition = data?.expeditions?.[0];
        if (expedition) {
          // 更新最後的時間戳
          lastTimestampRef.current = expedition.timestamp;
          
          // 顯示通知
          if (showNotifications) {
            const rewardAmount = parseFloat(formatEther(BigInt(expedition.reward || '0'))).toFixed(4);
            const message = expedition.success
              ? `🎉 遠征成功！獲得 ${rewardAmount} SOUL 和 ${expedition.expGained} 經驗值`
              : `😢 遠征失敗... 獲得 ${expedition.expGained} 經驗值`;
            
            showToast(message, expedition.success ? 'success' : 'error');
          }
          
          // 調用回調
          if (onNewExpedition) {
            onNewExpedition(expedition);
          }
          
          logger.info('New expedition result:', {
            success: expedition.success,
            reward: expedition.reward,
            expGained: expedition.expGained,
            dungeonName: expedition.dungeonName,
          });
        }
      },
    }
  );
  */
  
  // 當地址改變時重置時間戳
  useEffect(() => {
    lastTimestampRef.current = Math.floor(Date.now() / 1000).toString();
  }, [playerAddress]);
  
  return {
    latestExpedition: data?.expeditions?.[0],
    loading,
    error,
  };
}