import React, { useState, useEffect } from 'react';
import { useReadContracts, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import type { Abi } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContractWithABI } from '../../config/contractsWithABI';
import { useAppToast } from '../../hooks/useAppToast';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { formatAddress } from 'viem';

type SupportedChainId = typeof bsc.id;

interface AltarRuleManagerProps {
  chainId: SupportedChainId;
}

const AltarRuleManager: React.FC<AltarRuleManagerProps> = ({ chainId }) => {
  const { showToast } = useAppToast();
  const { writeContractAsync } = useWriteContract();
  const [pendingRule, setPendingRule] = useState<number | null>(null);
  const [vipBonusAddress, setVipBonusAddress] = useState('');
  const [vipBonusRate, setVipBonusRate] = useState('');
  const [isSettingBonus, setIsSettingBonus] = useState(false);
  
  const altarContract = getContractWithABI('ALTAROFASCENSION');

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
    cooldownTime: string;
    isActive: boolean;
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
          cooldownTime: string;
          isActive: boolean;
        }
      > = {};
      rulesData.forEach((d, i) => {
        if (d.status === 'success' && Array.isArray(d.result)) {
          const [materialsRequired, nativeFee, greatSuccessChance, successChance, partialFailChance, cooldownTime, isActive] = d.result as [
            number,
            bigint,
            number,
            number,
            number,
            bigint,
            boolean
          ];
          if (materialsRequired !== undefined) {
            initialInputs[i + 1] = {
              materialsRequired: materialsRequired.toString(),
              nativeFee: formatEther(nativeFee),
              greatSuccessChance: greatSuccessChance.toString(),
              successChance: successChance.toString(),
              partialFailChance: partialFailChance.toString(),
              cooldownTime: (Number(cooldownTime) / 3600).toString(), // 轉換為小時
              isActive: isActive
            };
          }
        }
      });
      setRuleInputs(initialInputs);
    }
  }, [rulesData]);

  const handleInputChange = (id: number, field: string, value: string | boolean) => {
    setRuleInputs(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  const validateRule = (inputs: typeof ruleInputs[number]) => {
    const totalChance = Number(inputs.greatSuccessChance) + 
                       Number(inputs.successChance) + 
                       Number(inputs.partialFailChance);
    
    if (totalChance > 100) {
      throw new Error(`總機率不能超過 100%（當前：${totalChance}%）`);
    }
    
    if (Number(inputs.materialsRequired) < 1) {
      throw new Error('材料數量必須至少為 1');
    }
    
    if (Number(inputs.nativeFee) < 0) {
      throw new Error('費用不能為負數');
    }
    
    if (Number(inputs.cooldownTime) < 0) {
      throw new Error('冷卻時間不能為負數');
    }
  };

  const handleUpdateRule = async (id: number) => {
    if (!altarContract) return;
    
    setPendingRule(id);
    const inputs = ruleInputs[id];
    
    try {
      // 驗證輸入參數
      validateRule(inputs);
      
      // V25 新的函數簽名：8 個獨立參數
      await writeContractAsync({
        address: altarContract.address,
        abi: altarContract.abi as Abi,
        functionName: 'setUpgradeRule',
        args: [
          id,                                           // _rarity
          Number(inputs.materialsRequired),             // _materialsRequired
          parseEther(inputs.nativeFee),                // _nativeFee
          Number(inputs.greatSuccessChance),           // _greatSuccessChance
          Number(inputs.successChance),                // _successChance
          Number(inputs.partialFailChance),            // _partialFailChance
          BigInt(Number(inputs.cooldownTime) * 3600),  // _cooldownTime (轉換小時為秒)
          inputs.isActive                              // _isActive
        ],
      });
      
      showToast(`升星規則 #${id} 更新成功！`, 'success');
      setTimeout(() => refetch(), 2000);
    } catch (e) {
      const error = e as { shortMessage?: string; message?: string };
      const errorMessage = error.shortMessage || error.message || `規則 #${id} 更新失敗`;
      showToast(errorMessage, "error");
    } finally {
      setPendingRule(null);
    }
  };

  if (isLoading) return <LoadingSpinner />;

  const handleSetVipBonus = async () => {
    if (!altarContract || !vipBonusAddress || !vipBonusRate) return;
    
    setIsSettingBonus(true);
    try {
      await writeContractAsync({
        address: altarContract.address,
        abi: altarContract.abi as Abi,
        functionName: 'setAdditionalVIPBonus',
        args: [vipBonusAddress, Number(vipBonusRate)]
      });
      
      showToast(`神秘加成設定成功！`, 'success');
      setVipBonusAddress('');
      setVipBonusRate('');
    } catch (e) {
      const error = e as { shortMessage?: string };
      showToast(error.shortMessage || `神秘加成設定失敗`, "error");
    } finally {
      setIsSettingBonus(false);
    }
  };

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
          partialFailChance: '',
          cooldownTime: '',
          isActive: true
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
              <div>
                <label htmlFor={`rule-${ruleId}-cooldown`} className="text-xs text-gray-400 block mb-1">冷卻時間 (小時)</label>
                <input
                  id={`rule-${ruleId}-cooldown`}
                  name={`rule-${ruleId}-cooldown`}
                  type="text"
                  value={inputs.cooldownTime}
                  onChange={e => handleInputChange(ruleId, 'cooldownTime', e.target.value)}
                  placeholder="冷卻時間 (小時)"
                  className="input-field"
                />
              </div>
              <div>
                <label htmlFor={`rule-${ruleId}-active`} className="text-xs text-gray-400 block mb-1">啟用狀態</label>
                <select
                  id={`rule-${ruleId}-active`}
                  name={`rule-${ruleId}-active`}
                  value={inputs.isActive ? 'true' : 'false'}
                  onChange={e => handleInputChange(ruleId, 'isActive', e.target.value === 'true')}
                  className="input-field"
                >
                  <option value="true">啟用</option>
                  <option value="false">停用</option>
                </select>
              </div>
              <ActionButton
                onClick={() => handleUpdateRule(ruleId)}
                isLoading={pendingRule === ruleId}
                className="h-10 sm:col-span-3"
              >
                更新
              </ActionButton>
            </div>
          </details>
        );
      })}
      
      {/* 神秘加成設定 */}
      <details className="p-3 bg-black/20 rounded-lg">
        <summary className="font-bold text-lg text-purple-400 cursor-pointer">
          🎆 神秘加成管理
        </summary>
        <div className="pt-3 space-y-3">
          <p className="text-sm text-gray-400">
            為特定玩家設定神秘的升星成功率加成（最高20%）
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
            <div>
              <label className="text-xs text-gray-400 block mb-1">玩家地址</label>
              <input
                type="text"
                value={vipBonusAddress}
                onChange={e => setVipBonusAddress(e.target.value)}
                placeholder="0x..."
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">加成率 (%)</label>
              <input
                type="number"
                value={vipBonusRate}
                onChange={e => setVipBonusRate(e.target.value)}
                placeholder="0-20"
                min="0"
                max="20"
                className="input-field"
              />
            </div>
            <ActionButton
              onClick={handleSetVipBonus}
              isLoading={isSettingBonus}
              className="h-10"
            >
              設定加成
            </ActionButton>
          </div>
          <p className="text-xs text-gray-500">
            注意：神秘加成會與 VIP 等級加成疊加，最高上限 20%
          </p>
        </div>
      </details>
    </div>
  );
};

export default AltarRuleManager;