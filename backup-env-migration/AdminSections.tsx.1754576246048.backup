// 從 AdminPage 拆分出來的管理區塊組件，優化性能

import React, { memo, useCallback } from 'react';
import { useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ActionButton } from '../ui/ActionButton';
import { getContractWithABI } from '../../config/contractsWithABI';
import type { ContractName } from '../../config/contracts';
import { bsc } from 'wagmi/chains';

// 合約串接中心組件
export const ContractConnectionCenter = memo<{
  setupConfig: any[];
  contractsToRead: any[];
  onExecuteSetup: (config: any) => void;
  isProcessing: boolean;
}>((({ setupConfig, contractsToRead, onExecuteSetup, isProcessing }) => {
  const { data: readResults, isLoading } = useReadContracts({
    contracts: contractsToRead,
    query: { enabled: contractsToRead.length > 0 }
  });

  const getStatus = useCallback((configItem: any) => {
    const index = setupConfig.indexOf(configItem);
    if (!readResults || !readResults[index]) return '檢查中...';
    
    const result = readResults[index];
    if (result.status === 'failure') return '讀取失敗';
    if (!result.result) return '未設定';
    
    const expectedAddress = getContractWithABI(bsc.id, configItem.valueToSetContractName)?.address;
    return result.result === expectedAddress ? '✅ 已正確設定' : '❌ 設定錯誤';
  }, [readResults, setupConfig]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold mb-4">合約串接設定</h3>
      {isLoading && <LoadingSpinner />}
      {!isLoading && setupConfig.map(config => (
        <div key={config.key} className="flex items-center justify-between p-3 bg-gray-800 rounded">
          <div>
            <span className="font-medium">{config.title}</span>
            <span className="ml-4 text-sm text-gray-400">{getStatus(config)}</span>
          </div>
          <ActionButton
            onClick={() => onExecuteSetup(config)}
            disabled={isProcessing || getStatus(config) === '✅ 已正確設定'}
            isLoading={isProcessing}
            className="px-4 py-2"
          >
            設定
          </ActionButton>
        </div>
      ))}
    </div>
  );
}));
ContractConnectionCenter.displayName = 'ContractConnectionCenter';

// 價格設定區塊
export const PriceSettingsSection = memo<{
  contracts: any[];
  onValueChange: (key: string, value: string) => void;
  onExecute: (config: any) => void;
  inputValues: Record<string, string>;
  isProcessing: boolean;
}>((({ contracts, onValueChange, onExecute, inputValues, isProcessing }) => {
  const { data: readResults } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 }
  });

  return (
    <div className="space-y-4">
      {contracts.map((contract, index) => {
        const result = readResults?.[index];
        const currentValue = result?.status === 'success' ? result.result : null;
        
        return (
          <div key={contract.functionName} className="p-4 bg-gray-800 rounded">
            <h4 className="font-medium mb-2">{contract.functionName}</h4>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                目前: {currentValue ? formatEther(currentValue as bigint) : '載入中...'}
              </div>
              <input
                type="text"
                value={inputValues[contract.functionName] || ''}
                onChange={(e) => onValueChange(contract.functionName, e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 rounded"
                placeholder="輸入新值"
              />
              <ActionButton
                onClick={() => onExecute(contract)}
                disabled={isProcessing || !inputValues[contract.functionName]}
                isLoading={isProcessing}
              >
                更新
              </ActionButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}));
PriceSettingsSection.displayName = 'PriceSettingsSection';

// 參數設定區塊
export const ParametersSection = memo<{
  title: string;
  parameters: any[];
  onValueChange: (key: string, value: string) => void;
  onExecute: (param: any) => void;
  inputValues: Record<string, string>;
  isProcessing: boolean;
}>((({ title, parameters, onValueChange, onExecute, inputValues, isProcessing }) => {
  const contracts = parameters.map(p => ({
    address: p.contractAddress,
    abi: p.contractAbi,
    functionName: p.getter,
  }));

  const { data: readResults } = useReadContracts({
    contracts,
    query: { enabled: contracts.length > 0 }
  });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold mb-4">{title}</h3>
      {parameters.map((param, index) => {
        const result = readResults?.[index];
        const currentValue = result?.status === 'success' ? result.result : null;
        
        return (
          <div key={param.key} className="p-4 bg-gray-800 rounded">
            <h4 className="font-medium mb-2">{param.title}</h4>
            <p className="text-sm text-gray-400 mb-3">{param.description}</p>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                目前: {currentValue !== null ? param.formatter(currentValue) : '載入中...'}
              </div>
              <input
                type="text"
                value={inputValues[param.key] || ''}
                onChange={(e) => onValueChange(param.key, e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 rounded"
                placeholder={param.placeholder}
              />
              <ActionButton
                onClick={() => onExecute(param)}
                disabled={isProcessing || !inputValues[param.key]}
                isLoading={isProcessing}
              >
                設定
              </ActionButton>
            </div>
          </div>
        );
      })}
    </div>
  );
}));
ParametersSection.displayName = 'ParametersSection';