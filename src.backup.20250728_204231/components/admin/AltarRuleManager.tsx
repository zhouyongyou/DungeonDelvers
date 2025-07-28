import React, { useState, useEffect } from 'react';
import { useReadContracts, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import type { Abi } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract } from '../../config/contracts';
import { useAppToast } from '../../hooks/useAppToast';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';

type SupportedChainId = typeof bsc.id;

interface AltarRuleManagerProps {
  chainId: SupportedChainId;
}

const AltarRuleManager: React.FC<AltarRuleManagerProps> = ({ chainId }) => {
  const { showToast } = useAppToast();
  const { writeContractAsync } = useWriteContract();
  const [pendingRule, setPendingRule] = useState<number | null>(null);
  
  const altarContract = getContract('ALTAROFASCENSION');

  const { data: rulesData, isLoading, refetch } = useReadContracts({
    contracts: Array.from({ length: 4 }, (_, i) => ({
      ...altarContract,
      functionName: 'upgradeRules',
      args: [i + 1]
    })),
    query: { 
      enabled: !!altarContract,
      staleTime: 1000 * 60 * 15, // 15分鐘 - 升星祭壇規則很少變更
      gcTime: 1000 * 60 * 45,    // 45分鐘
      refetchOnWindowFocus: false,
      retry: 2,
    }
  });

  const [ruleInputs, setRuleInputs] = useState<Record<number, {
    materialsRequired: string;
    nativeFee: string;
    greatSuccessChance: string;
    successChance: string;
    partialFailChance: string;
  }>>({});

  useEffect(() => {
    if (rulesData) {
      const initialInputs: Record<
        number,
        {
          materialsRequired: string;
          nativeFee: string;
          greatSuccessChance: string;
          successChance: string;
          partialFailChance: string;
        }
      > = {};
      rulesData.forEach((d, i) => {
        if (d.status === 'success' && Array.isArray(d.result)) {
          const [materialsRequired, nativeFee, greatSuccessChance, successChance, partialFailChance] = d.result as [
            number,
            bigint,
            number,
            number,
            number
          ];
          if (materialsRequired !== undefined) {
            initialInputs[i + 1] = {
              materialsRequired: materialsRequired.toString(),
              nativeFee: formatEther(nativeFee),
              greatSuccessChance: greatSuccessChance.toString(),
              successChance: successChance.toString(),
              partialFailChance: partialFailChance.toString()
            };
          }
        }
      });
      setRuleInputs(initialInputs);
    }
  }, [rulesData]);

  const handleInputChange = (id: number, field: string, value: string) => {
    setRuleInputs(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleUpdateRule = async (id: number) => {
    if (!altarContract) return;
    
    setPendingRule(id);
    const inputs = ruleInputs[id];
    
    try {
      await writeContractAsync({
        address: altarContract.address,
        abi: altarContract.abi as Abi,
        functionName: 'setUpgradeRule',
        args: [
          id,
          {
            materialsRequired: Number(inputs.materialsRequired),
            nativeFee: parseEther(inputs.nativeFee),
            greatSuccessChance: Number(inputs.greatSuccessChance),
            successChance: Number(inputs.successChance),
            partialFailChance: Number(inputs.partialFailChance)
          }
        ],
      });
      
      showToast(`升星規則 #${id} 更新成功！`, 'success');
      setTimeout(() => refetch(), 2000);
    } catch (e) {
      const error = e as { shortMessage?: string };
      showToast(error.shortMessage || `規則 #${id} 更新失敗`, "error");
    } finally {
      setPendingRule(null);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      {rulesData?.map((d: unknown, i: number) =>  {
        const ruleId = i + 1;
        if (d.status !== 'success' || !d.result) {
          return (
            <div key={ruleId}>
              規則 #{ruleId}: 讀取失敗
            </div>
          );
        }
        
        const inputs = ruleInputs[ruleId] || {
          materialsRequired: '',
          nativeFee: '',
          greatSuccessChance: '',
          successChance: '',
          partialFailChance: ''
        };
        
        return (
          <details key={ruleId} className="p-3 bg-black/20 rounded-lg" open>
            <summary className="font-bold text-lg text-yellow-400 cursor-pointer">
              升 {ruleId + 1}★ 規則
            </summary>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end pt-2">
              <div>
                <label htmlFor={`rule-${ruleId}-materials`} className="text-xs text-gray-400 block mb-1">材料數量</label>
                <input
                  id={`rule-${ruleId}-materials`}
                  name={`rule-${ruleId}-materials`}
                  type="text"
                  value={inputs.materialsRequired}
                  onChange={e => handleInputChange(ruleId, 'materialsRequired', e.target.value)}
                  placeholder="材料數量"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor={`rule-${ruleId}-fee`} className="text-xs text-gray-400 block mb-1">費用 (BNB)</label>
                <input
                  id={`rule-${ruleId}-fee`}
                  name={`rule-${ruleId}-fee`}
                  type="text"
                  value={inputs.nativeFee}
                  onChange={e => handleInputChange(ruleId, 'nativeFee', e.target.value)}
                  placeholder="費用 (BNB)"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor={`rule-${ruleId}-great-success`} className="text-xs text-gray-400 block mb-1">大成功率 (%)</label>
                <input
                  id={`rule-${ruleId}-great-success`}
                  name={`rule-${ruleId}-great-success`}
                  type="text"
                  value={inputs.greatSuccessChance}
                  onChange={e => handleInputChange(ruleId, 'greatSuccessChance', e.target.value)}
                  placeholder="大成功率 (%)"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor={`rule-${ruleId}-success`} className="text-xs text-gray-400 block mb-1">成功率 (%)</label>
                <input
                  id={`rule-${ruleId}-success`}
                  name={`rule-${ruleId}-success`}
                  type="text"
                  value={inputs.successChance}
                  onChange={e => handleInputChange(ruleId, 'successChance', e.target.value)}
                  placeholder="成功率 (%)"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor={`rule-${ruleId}-partial-fail`} className="text-xs text-gray-400 block mb-1">部分失敗率 (%)</label>
                <input
                  id={`rule-${ruleId}-partial-fail`}
                  name={`rule-${ruleId}-partial-fail`}
                  type="text"
                  value={inputs.partialFailChance}
                  onChange={e => handleInputChange(ruleId, 'partialFailChance', e.target.value)}
                  placeholder="部分失敗率 (%)"
                  className="input-field"
                />
              </div>
              <ActionButton
                onClick={() => handleUpdateRule(ruleId)}
                isLoading={pendingRule === ruleId}
                className="h-10"
              >
                更新
              </ActionButton>
            </div>
          </details>
        );
      })}
    </div>
  );
};

export default AltarRuleManager;