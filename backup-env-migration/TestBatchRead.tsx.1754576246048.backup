import React, { useEffect } from 'react';
import { useReadContracts, useContractRead } from 'wagmi';
import { getContract } from '../../config/contracts';
import { logger } from '../../utils/logger';
import { formatEther } from 'viem';

export const TestBatchRead: React.FC = () => {
  const chainId = 56;
  const dungeonMasterContract = getContract('DUNGEONMASTER');
  
  // 測試單個合約讀取 - explorationFee
  const { data: singleData, error: singleError, isLoading: singleLoading } = useContractRead({
    address: dungeonMasterContract?.address,
    abi: dungeonMasterContract?.abi,
    functionName: 'explorationFee',
    enabled: !!dungeonMasterContract
  });
  
  // 測試批量讀取
  const testContracts = [
    {
      address: dungeonMasterContract?.address,
      abi: dungeonMasterContract?.abi,
      functionName: 'explorationFee'
    },
    {
      address: dungeonMasterContract?.address,
      abi: dungeonMasterContract?.abi,
      functionName: 'provisionPriceUSD'
    },
    {
      address: dungeonMasterContract?.address,
      abi: dungeonMasterContract?.abi,
      functionName: 'restCostPowerDivisor'
    }
  ];
  
  // 直接使用 wagmi 的 useReadContracts
  const { data: batchData, error: batchError, isLoading: batchLoading } = useReadContracts({
    contracts: testContracts,
    allowFailure: true,
    query: {
      enabled: !!dungeonMasterContract
    }
  });
  
  useEffect(() => {
    logger.info('TestBatchRead 單個讀取結果:', {
      isLoading: singleLoading,
      hasError: !!singleError,
      errorMessage: singleError?.message,
      data: singleData,
      formattedData: singleData ? formatEther(singleData as bigint) : 'N/A'
    });
    
    logger.info('TestBatchRead 批量讀取結果:', {
      isLoading: batchLoading,
      hasError: !!batchError,
      errorMessage: batchError?.message,
      data: batchData,
      contractAddress: dungeonMasterContract?.address
    });
  }, [singleLoading, singleError, singleData, batchLoading, batchError, batchData, dungeonMasterContract]);
  
  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl mb-4">合約讀取測試</h1>
      
      <div className="border p-4 rounded">
        <h2 className="text-xl mb-2">單個讀取測試 (explorationFee)</h2>
        <div className="space-y-2">
          <p>Loading: {singleLoading ? 'Yes' : 'No'}</p>
          <p>Error: {singleError ? singleError.message : 'None'}</p>
          <p>Raw Data: {singleData?.toString()}</p>
          <p>Formatted: {singleData !== undefined ? formatEther(singleData as bigint) + ' BNB' : 'N/A'}</p>
        </div>
      </div>
      
      <div className="border p-4 rounded">
        <h2 className="text-xl mb-2">批量讀取測試</h2>
        <div className="space-y-2">
          <p>Loading: {batchLoading ? 'Yes' : 'No'}</p>
          <p>Error: {batchError ? batchError.message : 'None'}</p>
          <p>Contract Address: {dungeonMasterContract?.address}</p>
          {batchData?.map((item, index) => (
            <div key={index} className="ml-4">
              <p>第 {index + 1} 個結果:</p>
              <p className="ml-4">Status: {item.status}</p>
              <p className="ml-4">Result: {item.result?.toString()}</p>
              {item.error && <p className="ml-4 text-red-500">Error: {item.error.message}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};