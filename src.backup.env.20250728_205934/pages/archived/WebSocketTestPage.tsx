// WebSocketTestPage.tsx - 測試 WebSocket 連接的頁面

import React from 'react';
import { useSubscription, gql } from '@apollo/client';
import { useRealtimePartyStatus } from '../../hooks/useRealtimePartyStatus';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

// 測試訂閱 - 監聽區塊更新
const BLOCK_SUBSCRIPTION = gql`
  subscription OnNewBlock {
    _meta {
      block {
        number
        hash
        timestamp
      }
    }
  }
`;

export const WebSocketTestPage: React.FC = () => {
  // 測試基本的區塊訂閱
  const { data: blockData, loading: blockLoading, error: blockError } = useSubscription(
    BLOCK_SUBSCRIPTION
  );
  
  // 測試隊伍狀態訂閱（使用一個示例 ID）
  const { party, loading: partyLoading, error: partyError, isRealtime, connectionStatus } = 
    useRealtimePartyStatus({ partyId: '1' });
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">WebSocket 連接測試</h1>
      
      {/* 連接狀態 */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">連接狀態</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            <span>狀態: {connectionStatus === 'connected' ? '已連接（即時更新）' : '輪詢模式'}</span>
          </div>
          <div>即時更新: {isRealtime ? '是' : '否'}</div>
        </div>
      </div>
      
      {/* 區塊訂閱測試 */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">區塊訂閱測試</h2>
        {blockLoading && <LoadingSpinner />}
        {blockError && (
          <div className="text-red-500">錯誤: {blockError.message}</div>
        )}
        {blockData && (
          <div className="space-y-2 font-mono text-sm">
            <div>區塊高度: {blockData._meta.block.number}</div>
            <div>區塊哈希: {blockData._meta.block.hash}</div>
            <div>時間戳: {new Date(blockData._meta.block.timestamp * 1000).toLocaleString()}</div>
          </div>
        )}
      </div>
      
      {/* 隊伍狀態訂閱測試 */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">隊伍狀態訂閱測試（隊伍 #1）</h2>
        {partyLoading && <LoadingSpinner />}
        {partyError && (
          <div className="text-red-500">錯誤: {partyError.message}</div>
        )}
        {party && (
          <div className="space-y-2">
            <div>ID: {party.id}</div>
            <div>未領取獎勵: {party.unclaimedRewards}</div>
            <div>冷卻結束時間: {party.cooldownEndsAt}</div>
            <div>總戰力: {party.totalPower}</div>
            <div>最後更新: {new Date(party.lastUpdatedAt * 1000).toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
};