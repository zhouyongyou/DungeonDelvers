// src/pages/DebugContractPage.tsx - 合約調試頁面

import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { getContractWithABI } from '../config/contractsWithABI';
import { bsc } from 'wagmi/chains';
import { logger } from '../utils/logger';

const DebugContractPage: React.FC = () => {
  const { address, chainId } = useAccount();
  const [debugInfo, setDebugInfo] = useState<any>({});

  // 讀取 DungeonCore 的 owner
  const dungeonCoreContract = getContractWithABI('DUNGEONCORE');
  
  const { data: owner, error: ownerError, isLoading } = useReadContract({
    address: dungeonCoreContract?.address,
    abi: dungeonCoreContract?.abi,
    functionName: 'owner',
    chainId: bsc.id,
  });

  // 讀取其他測試數據
  const { data: oracleAddress, error: oracleError } = useReadContract({
    address: dungeonCoreContract?.address,
    abi: dungeonCoreContract?.abi,
    functionName: 'oracleAddress',
    chainId: bsc.id,
  });

  useEffect(() => {
    const info = {
      userAddress: address,
      chainId: chainId,
      expectedChainId: bsc.id,
      dungeonCoreAddress: dungeonCoreContract?.address,
      owner: owner,
      ownerError: ownerError?.message,
      oracleAddress: oracleAddress,
      oracleError: oracleError?.message,
      isLoading: isLoading,
    };
    
    setDebugInfo(info);
    logger.info('Debug Info:', info);
  }, [address, chainId, owner, ownerError, oracleAddress, oracleError, isLoading]);

  return (
    <div className="p-6 bg-gray-800 rounded-lg">
      <h2 className="text-2xl font-bold mb-4">合約調試頁面</h2>
      
      <div className="space-y-4">
        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">連接信息</h3>
          <p>用戶地址: {address || '未連接'}</p>
          <p>當前鏈 ID: {chainId || '未連接'}</p>
          <p>預期鏈 ID: {bsc.id}</p>
          <p>鏈匹配: {chainId === bsc.id ? '✅ 是' : '❌ 否'}</p>
        </div>

        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">DungeonCore 合約</h3>
          <p>合約地址: {dungeonCoreContract?.address || '未找到'}</p>
          <p>ABI 函數數: {dungeonCoreContract?.abi?.length || 0}</p>
        </div>

        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Owner 讀取測試</h3>
          <p>狀態: {isLoading ? '⏳ 加載中...' : owner ? '✅ 成功' : '❌ 失敗'}</p>
          <p>Owner 地址: {owner ? String(owner) : '未讀取到'}</p>
          {ownerError && (
            <p className="text-red-400">錯誤: {ownerError}</p>
          )}
        </div>

        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">Oracle 地址讀取測試</h3>
          <p>Oracle 地址: {oracleAddress ? String(oracleAddress) : '未讀取到'}</p>
          {oracleError && (
            <p className="text-red-400">錯誤: {oracleError}</p>
          )}
        </div>

        <div className="bg-gray-700 p-4 rounded">
          <h3 className="text-lg font-semibold mb-2">原始調試信息</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DebugContractPage;