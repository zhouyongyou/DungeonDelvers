// 最簡單的測試版本
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useQuery as useApolloQuery, gql } from '@apollo/client';
import { useAppToast } from './contexts/SimpleToastContext';

function UltraSimpleApp() {
  // 測試 React Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['test-query'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { message: 'React Query 正常運行', timestamp: Date.now() };
    },
  });

  // 測試 Wagmi
  const { address, isConnected } = useAccount();

  // 測試 Apollo GraphQL
  const TEST_QUERY = gql`
    query TestQuery {
      heroes(first: 1) {
        id
        tokenId
      }
    }
  `;
  
  const { data: apolloData, loading: apolloLoading, error: apolloError } = useApolloQuery(TEST_QUERY);

  // 測試 Toast Provider
  const { showToast } = useAppToast();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-4">超簡單測試頁面</h1>
      <p className="text-lg mb-4">時間：{new Date().toLocaleTimeString()}</p>
      <div className="flex gap-4 mb-8">
        <button 
          onClick={() => showToast('Toast 功能正常！', 'success')}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          測試 Toast
        </button>
        <button 
          onClick={() => alert('按鈕正常')}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          測試 Alert
        </button>
      </div>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">測試步驟：</h2>
        <p>✅ 基本 React 組件</p>
        <p>✅ Tailwind CSS 樣式</p>
        <p>✅ React Query: {isLoading ? '載入中...' : error ? '錯誤' : data?.message}</p>
        <p>✅ Wagmi: {isConnected ? `已連接 ${address}` : '未連接'}</p>
        <p>✅ Apollo GraphQL: {apolloLoading ? '載入中...' : apolloError ? `錯誤: ${apolloError.message}` : apolloData ? `找到 ${apolloData.heroes?.length || 0} 個英雄` : '無資料'}</p>
        <p>✅ Toast Provider: 點擊綠色按鈕測試</p>
        <p>⏭️ 下一步：切換到完整 App 組件</p>
      </div>
    </div>
  );
}

export default UltraSimpleApp;