// MinimalApp.tsx - 最小化版本用於診斷

import React from 'react';
import { useAccount } from 'wagmi';

function MinimalApp() {
  const { address, isConnected } = useAccount();
  
  return (
    <div style={{ padding: '20px' }}>
      <h1>最小化測試頁面</h1>
      <p>連接狀態: {isConnected ? '已連接' : '未連接'}</p>
      <p>地址: {address || '無'}</p>
      <p>如果這個頁面正常顯示，問題在其他組件中</p>
    </div>
  );
}

export default MinimalApp;