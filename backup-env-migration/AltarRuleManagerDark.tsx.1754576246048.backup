// AltarRuleManagerDark.tsx - 深色模式版本的祭壇規則管理器

import React, { useState, useEffect } from 'react';
import { useReadContracts, useWriteContract } from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';
import type { Abi } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContractWithABI } from '../../config/contractsWithABI';
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
  
  // 使用 ABI 版本的合約配置
  const altarContract = getContractWithABI(chainId, 'altarOfAscension');

  const { data: rulesData, isLoading, refetch } = useReadContracts({
    contracts: Array.from({ length: 4 }, (_, i) => ({
      ...altarContract,
      functionName: 'upgradeRules',
      args: [i + 1]
    })),
    query: { 
      enabled: !!altarContract,
      staleTime: 1000 * 60 * 15,
      gcTime: 1000 * 60 * 45,
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
      const initialInputs: Record<number, any> = {};
      rulesData.forEach((d, i) => {
        if (d.status === 'success' && d.result) {
          const [materialsRequired, nativeFee, greatSuccessChance, successChance, partialFailChance, cooldownTime, isActive] = d.result as any[];
          initialInputs[i + 1] = {
            materialsRequired: materialsRequired?.toString() || '',
            nativeFee: nativeFee ? formatEther(nativeFee) : '',
            greatSuccessChance: greatSuccessChance?.toString() || '',
            successChance: successChance?.toString() || '',
            partialFailChance: partialFailChance?.toString() || '',
            cooldownTime: cooldownTime?.toString() || '0',
            isActive: Boolean(isActive)
          };
        }
      });
      setRuleInputs(initialInputs);
    }
  }, [rulesData]);

  const updateInput = (id: number, field: string, value: string | boolean) => {
    setRuleInputs(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: field === 'isActive' ? (value === 'true' || value === true) : value }
    }));
  };

  const validateRule = (inputs: any) => {
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

  const updateRule = async (id: number) => {
    const inputs = ruleInputs[id];
    if (!inputs || !altarContract) return;

    setPendingRule(id);
    try {
      // 驗證輸入參數
      validateRule(inputs);
      
      // V25 新的函數簽名：8 個獨立參數
      await writeContractAsync({
        ...altarContract,
        functionName: 'setUpgradeRule',
        args: [
          id,                                           // _rarity
          Number(inputs.materialsRequired),             // _materialsRequired
          parseEther(inputs.nativeFee),                // _nativeFee
          Number(inputs.greatSuccessChance),           // _greatSuccessChance
          Number(inputs.successChance),                // _successChance
          Number(inputs.partialFailChance),            // _partialFailChance
          BigInt(Number(inputs.cooldownTime) || 0),    // _cooldownTime (秒為單位)
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

  // 檢查合約地址是否有效
  if (!altarContract || !altarContract.address || !isAddress(altarContract.address)) {
    return (
      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-6 text-center">
        <div className="text-yellow-400 text-xl mb-2">⚠️ 祭壇功能暫未啟用</div>
        <p className="text-yellow-300 text-sm">
          升星祭壇合約地址未正確配置，將在 V18 部署後啟用
        </p>
        <p className="text-xs text-gray-400 mt-2">
          當前配置: {altarContract?.address || '未設置'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 說明文字 */}
      <div className="bg-blue-900/20 border border-blue-600 rounded-lg p-4 mb-4">
        <p className="text-blue-300 text-sm">
          設置不同稀有度升級到更高稀有度的規則。總機率（大成功+成功+部分失敗）必須小於 100%，剩餘機率為完全失敗。
        </p>
      </div>

      {rulesData?.map((d: any, i: number) => {
        const ruleId = i + 1;
        if (d.status !== 'success' || !d.result) {
          return (
            <div key={ruleId} className="text-red-400">
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
          cooldownTime: '0',
          isActive: true
        };
        
        // 計算失敗率
        const failChance = 100 - Number(inputs.greatSuccessChance || 0) - Number(inputs.successChance || 0) - Number(inputs.partialFailChance || 0);
        
        return (
          <details key={ruleId} className="bg-gray-800 rounded-lg p-4" open>
            <summary className="font-bold text-lg text-yellow-400 cursor-pointer hover:text-yellow-300 transition-colors">
              {ruleId}★ → {ruleId + 1}★ 升級規則
            </summary>
            
            <div className="mt-4 space-y-4">
              {/* 材料需求、費用、冷卻時間 */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">材料需求</label>
                  <input
                    type="number"
                    value={inputs.materialsRequired}
                    onChange={(e) => updateInput(ruleId, 'materialsRequired', e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-yellow-400 focus:outline-none"
                    placeholder="需要的NFT數量"
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">BNB 費用</label>
                  <input
                    type="text"
                    value={inputs.nativeFee}
                    onChange={(e) => updateInput(ruleId, 'nativeFee', e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-yellow-400 focus:outline-none"
                    placeholder="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">冷卻時間 (秒)</label>
                  <input
                    type="number"
                    value={inputs.cooldownTime}
                    onChange={(e) => updateInput(ruleId, 'cooldownTime', e.target.value)}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-yellow-400 focus:outline-none"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {/* 機率設置 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    大成功機率 (獲得2個升級NFT)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={inputs.greatSuccessChance}
                      onChange={(e) => updateInput(ruleId, 'greatSuccessChance', e.target.value)}
                      className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-yellow-400 focus:outline-none"
                      placeholder="5"
                      min="0"
                      max="100"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    成功機率 (獲得1個升級NFT)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={inputs.successChance}
                      onChange={(e) => updateInput(ruleId, 'successChance', e.target.value)}
                      className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-yellow-400 focus:outline-none"
                      placeholder="65"
                      min="0"
                      max="100"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    部分失敗機率 (返還50%材料)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={inputs.partialFailChance}
                      onChange={(e) => updateInput(ruleId, 'partialFailChance', e.target.value)}
                      className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-yellow-400 focus:outline-none"
                      placeholder="25"
                      min="0"
                      max="100"
                    />
                    <span className="text-gray-400">%</span>
                  </div>
                </div>

                <div className="bg-red-900/20 border border-red-600 rounded p-3">
                  <label className="block text-sm text-red-400 mb-1">
                    完全失敗機率 (損失所有材料)
                  </label>
                  <div className="text-red-300 text-lg font-bold">
                    {failChance}%
                  </div>
                </div>

                {/* 規則啟用狀態 */}
                <div className="flex items-center gap-3 p-3 bg-gray-700/50 rounded">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={inputs.isActive}
                      onChange={(e) => updateInput(ruleId, 'isActive', e.target.checked.toString())}
                      className="sr-only"
                    />
                    <div className={`relative w-11 h-6 rounded-full transition-colors ${
                      inputs.isActive ? 'bg-green-600' : 'bg-gray-600'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        inputs.isActive ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </div>
                    <span className="ml-3 text-sm text-gray-300">
                      規則啟用狀態 {inputs.isActive ? '(啟用)' : '(停用)'}
                    </span>
                  </label>
                </div>
              </div>

              {/* 機率總覽 */}
              <div className="bg-gray-900 rounded p-3">
                <div className="text-sm text-gray-400 mb-2">機率總覽：</div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="text-center">
                    <div className="text-green-400 font-bold">{inputs.greatSuccessChance || 0}%</div>
                    <div className="text-gray-500">大成功</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-bold">{inputs.successChance || 0}%</div>
                    <div className="text-gray-500">成功</div>
                  </div>
                  <div className="text-center">
                    <div className="text-yellow-400 font-bold">{inputs.partialFailChance || 0}%</div>
                    <div className="text-gray-500">部分失敗</div>
                  </div>
                  <div className="text-center">
                    <div className="text-red-400 font-bold">{failChance}%</div>
                    <div className="text-gray-500">完全失敗</div>
                  </div>
                </div>
              </div>

              {/* 更新按鈕 */}
              <ActionButton
                onClick={() => updateRule(ruleId)}
                isLoading={pendingRule === ruleId}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                更新規則
              </ActionButton>
            </div>
          </details>
        );
      })}

      {/* 祭壇狀態提示 */}
      <div className="mt-6 bg-gray-800 rounded-lg p-4">
        <h4 className="text-yellow-400 font-semibold mb-2">🎯 升級機制說明</h4>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• <strong>大成功</strong>：消耗材料，獲得 2 個高一級稀有度的 NFT</li>
          <li>• <strong>成功</strong>：消耗材料，獲得 1 個高一級稀有度的 NFT</li>
          <li>• <strong>部分失敗</strong>：返還 50% 數量的原稀有度 NFT</li>
          <li>• <strong>完全失敗</strong>：損失所有材料，無任何返還</li>
        </ul>
      </div>
    </div>
  );
};

export default AltarRuleManager;