// AddressSettingRowDark.tsx - 深色模式版本

import React from 'react';
import type { Address } from 'viem';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ActionButton } from '../ui/ActionButton';

interface AddressSettingRowProps {
  title: string;
  description: string;
  readSource: string;
  currentAddress?: Address;
  envAddress?: Address;
  envContractName?: string;
  isLoading: boolean;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSet: () => Promise<void>;
  isSetting: boolean;
}

const AddressSettingRow: React.FC<AddressSettingRowProps> = ({
  title,
  description,
  readSource,
  currentAddress,
  envAddress,
  envContractName,
  isLoading,
  inputValue,
  onInputChange,
  onSet,
  isSetting
}) => {
  const isConfigured = currentAddress && currentAddress !== '0x0000000000000000000000000000000000000000';
  const isEnvSet = envAddress && 
                   envAddress !== '0x0000000000000000000000000000000000000000' && 
                   envAddress.trim() !== '';
  const isMatched = isConfigured && isEnvSet && currentAddress?.toLowerCase() === envAddress?.toLowerCase();

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-2">
      <div>
        <h4 className="font-bold text-gray-200">{title}</h4>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      
      <div className="text-xs font-mono grid grid-cols-[90px_1fr_20px] items-center gap-x-2">
        <span className="text-gray-500">配置文件:</span>
        {isEnvSet ? (
          <span className="text-blue-400 truncate" title={envAddress}>
            {envContractName} ({envAddress})
          </span>
        ) : (
          <span className="text-gray-400">
            {envContractName && envAddress ? `${envContractName} (${envAddress})` : '未設置'}
          </span>
        )}
      </div>
      
      <div className="text-xs font-mono grid grid-cols-[90px_1fr_20px] items-center gap-x-2">
        <span className="text-gray-500" title={`讀取來源: ${readSource}`}>
          鏈上當前:
        </span>
        {isLoading ? (
          <LoadingSpinner size="h-3 w-3" />
        ) : (
          <>
            <span
              className={`${
                isConfigured ? 'text-green-400' : 'text-yellow-400'
              } truncate`}
              title={currentAddress}
            >
              {currentAddress || '尚未設定'}
            </span>
            {isEnvSet && isConfigured && (
              isMatched ? (
                <span title="匹配" className="text-green-400">✅</span>
              ) : (
                <span title="不匹配" className="text-yellow-400">⚠️</span>
              )
            )}
          </>
        )}
      </div>
      
      <div className="flex gap-2 pt-2">
        <div className="flex-1">
          <label htmlFor={`address-setting-${(title || 'unknown').replace(/\s+/g, '-')}`} className="sr-only">
            {title} 合約地址
          </label>
          <input
            id={`address-setting-${(title || 'unknown').replace(/\s+/g, '-')}`}
            name={`address-setting-${(title || 'unknown').replace(/\s+/g, '-')}`}
            type="text"
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="貼上新的合約地址"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 text-sm font-mono focus:border-yellow-400 focus:outline-none focus:ring-1 focus:ring-yellow-400"
          />
        </div>
        <ActionButton
          onClick={onSet}
          isLoading={isSetting}
          className="px-4 h-10 whitespace-nowrap"
        >
          設定
        </ActionButton>
      </div>
    </div>
  );
};

export default AddressSettingRow;