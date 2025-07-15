// src/components/admin/GlobalRewardSettings.tsx

import React, { useState, useMemo } from 'react';
import { useReadContracts, useWriteContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { getContract } from '../../config/contracts';
import { useAppToast } from '../../hooks/useAppToast';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import SettingRow from './SettingRow';
import type { SupportedChainId } from '../../types';

interface GlobalRewardSettingsProps {
  chainId: SupportedChainId;
}

const GlobalRewardSettings: React.FC<GlobalRewardSettingsProps> = ({ chainId }) => {
  const { showToast } = useAppToast();
  const { addTransaction } = useTransactionStore();
  const { writeContractAsync } = useWriteContract();
  
  const [inputs, setInputs] = useState({
    globalRewardMultiplier: '',
    provisionPriceUSD: '',
    explorationFee: '',
    restCostPowerDivisor: ''
  });

  const dungeonMasterContract = useMemo(() => getContract(chainId, 'dungeonMaster'), [chainId]);

  // 讀取當前參數
  const { data: currentParams, isLoading } = useReadContracts({
    contracts: [
      {
        ...dungeonMasterContract,
        functionName: 'globalRewardMultiplier'
      },
      {
        ...dungeonMasterContract,
        functionName: 'provisionPriceUSD'
      },
      {
        ...dungeonMasterContract,
        functionName: 'explorationFee'
      },
      {
        ...dungeonMasterContract,
        functionName: 'restCostPowerDivisor'
      }
    ],
    query: { 
      enabled: !!dungeonMasterContract,
      staleTime: 1000 * 60 * 15, // 15分鐘 - 全局獎勵參數變更頻率低
      gcTime: 1000 * 60 * 45,    // 45分鐘
      refetchOnWindowFocus: false,
      retry: 2,
    }
  });

  const currentValues = useMemo(() => ({
    globalRewardMultiplier: currentParams?.[0]?.result as bigint | undefined,
    provisionPriceUSD: currentParams?.[1]?.result as bigint | undefined,
    explorationFee: currentParams?.[2]?.result as bigint | undefined,
    restCostPowerDivisor: currentParams?.[3]?.result as bigint | undefined
  }), [currentParams]);

  const handleSet = async (key: keyof typeof inputs, functionName: string, processValue?: (val: string) => any) => {
    const value = inputs[key];
    if (!value) {
      showToast('請輸入數值', 'error');
      return;
    }

    try {
      const processedValue = processValue ? processValue(value) : value;
      const hash = await writeContractAsync({
        address: dungeonMasterContract!.address as `0x${string}`,
        abi: dungeonMasterContract!.abi,
        functionName,
        args: [processedValue]
      });
      
      addTransaction({ hash, description: `更新 ${key}` });
      showToast('設定已提交！', 'success');
      setInputs(prev => ({ ...prev, [key]: '' }));
    } catch (error: any) {
      if (!error.message?.includes('User rejected')) {
        showToast(`設定失敗: ${error.shortMessage || error.message}`, 'error');
      }
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
        <h4 className="text-blue-300 font-semibold mb-2">獎勵計算公式</h4>
        <p className="text-sm text-gray-300">
          實際獎勵 = 地下城基礎獎勵 × (globalRewardMultiplier ÷ 1000)
        </p>
        <p className="text-xs text-gray-400 mt-1">
          例如：globalRewardMultiplier = 1000 表示 100% 獎勵
        </p>
      </div>

      <SettingRow
        title="全局獎勵倍率"
        description="控制所有地下城獎勵的最終倍率 (1000 = 100%)"
        currentValue={currentValues.globalRewardMultiplier ? 
          `${currentValues.globalRewardMultiplier.toString()} (${Number(currentValues.globalRewardMultiplier) / 10}%)` : 
          '載入中...'
        }
        inputValue={inputs.globalRewardMultiplier}
        onInputChange={(val) => setInputs(prev => ({ ...prev, globalRewardMultiplier: val }))}
        onSet={() => handleSet('globalRewardMultiplier', 'setGlobalRewardMultiplier', (val) => BigInt(val))}
        placeholder="例如: 1000 (100%)"
        inputType="number"
      />

      <SettingRow
        title="補給品價格 (USD)"
        description="每個補給品的 USD 價格"
        currentValue={currentValues.provisionPriceUSD ? 
          `$${formatEther(currentValues.provisionPriceUSD)}` : 
          '載入中...'
        }
        inputValue={inputs.provisionPriceUSD}
        onInputChange={(val) => setInputs(prev => ({ ...prev, provisionPriceUSD: val }))}
        onSet={() => handleSet('provisionPriceUSD', 'setProvisionPriceUSD', (val) => BigInt(val))}
        placeholder="例如: 2 (USD)"
        inputType="number"
      />

      <SettingRow
        title="探索費用 (BNB)"
        description="每次探索需要支付的 BNB 費用"
        currentValue={currentValues.explorationFee ? 
          `${formatEther(currentValues.explorationFee)} BNB` : 
          '載入中...'
        }
        inputValue={inputs.explorationFee}
        onInputChange={(val) => setInputs(prev => ({ ...prev, explorationFee: val }))}
        onSet={() => handleSet('explorationFee', 'setExplorationFee', (val) => parseEther(val))}
        placeholder="例如: 0.0015"
        inputType="number"
        step="0.0001"
      />

      <SettingRow
        title="休息成本除數"
        description="休息成本 = 隊伍戰力 ÷ 此除數"
        currentValue={currentValues.restCostPowerDivisor?.toString() || '載入中...'}
        inputValue={inputs.restCostPowerDivisor}
        onInputChange={(val) => setInputs(prev => ({ ...prev, restCostPowerDivisor: val }))}
        onSet={() => handleSet('restCostPowerDivisor', 'setRestCostPowerDivisor', (val) => BigInt(val))}
        placeholder="例如: 200"
        inputType="number"
      />

      <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
        <h4 className="text-yellow-400 font-semibold mb-2">快速設定建議</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-300 mb-2">測試環境</p>
            <ActionButton
              onClick={() => setInputs({
                globalRewardMultiplier: '500',
                provisionPriceUSD: '1',
                explorationFee: '0.001',
                restCostPowerDivisor: '100'
              })}
              className="w-full text-xs"
            >
              套用測試參數 (50% 獎勵)
            </ActionButton>
          </div>
          <div>
            <p className="text-sm text-gray-300 mb-2">正式環境</p>
            <ActionButton
              onClick={() => setInputs({
                globalRewardMultiplier: '1000',
                provisionPriceUSD: '2',
                explorationFee: '0.0015',
                restCostPowerDivisor: '200'
              })}
              className="w-full text-xs"
            >
              套用正式參數 (100% 獎勵)
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalRewardSettings;