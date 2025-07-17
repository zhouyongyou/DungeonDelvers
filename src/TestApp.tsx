// 超級簡化的測試版本
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { useQuery as useApolloQuery, gql } from '@apollo/client';
import { useAppToast } from '../contexts/SimpleToastContext';

function TestApp() {
  // 測試 React Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['test'],
    queryFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return '測試查詢成功';
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

  // 測試 Toast Context
  const { showToast } = useAppToast();

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      minHeight: '100vh'
    }}>
      <h1>🔧 DungeonDelvers 測試頁面</h1>
      <p>✅ React 正常運行</p>
      <p>✅ 右鍵功能正常</p>
      <p>✅ 文字選擇正常</p>
      <p>✅ React Query: {isLoading ? '載入中...' : error ? '錯誤' : data}</p>
      <p>✅ Wagmi: {isConnected ? `已連接 ${address}` : '未連接'}</p>
      <p>✅ Apollo GraphQL: {apolloLoading ? '載入中...' : apolloError ? `錯誤: ${apolloError.message}` : apolloData ? `找到 ${apolloData.heroes?.length || 0} 個英雄` : '無資料'}</p>
      
      <button 
        onClick={() => showToast('Toast 功能正常！', 'success')}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px',
          marginRight: '10px'
        }}
      >
        測試 Toast
      </button>
      
      <button 
        onClick={() => alert('按鈕功能正常！')}
        style={{
          padding: '10px 20px',
          backgroundColor: '#059669',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        測試 Alert
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <h3>診斷信息：</h3>
        <ul>
          <li>瀏覽器：{navigator.userAgent}</li>
          <li>視窗大小：{window.innerWidth} x {window.innerHeight}</li>
          <li>時間戳：{new Date().toLocaleString()}</li>
        </ul>
      </div>
    </div>
  );
}

export default TestApp;