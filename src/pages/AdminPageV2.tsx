// src/pages/AdminPageV2.tsx - 全新的簡潔管理後台

import React, { useState, useMemo } from 'react';
import { useAccount, useReadContracts, useWriteContract, useReadContract } from 'wagmi';
import { formatEther, parseEther, isAddress } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract } from '../config/contracts';
import { useAppToast } from '../contexts/SimpleToastContext';
import { ActionButton } from '../components/ui/ActionButton';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { logger } from '../utils/logger';

// 簡潔的錯誤處理
const handleError = (error: any, operation: string) => {
  logger.error(`[Admin] ${operation} failed:`, error);
  return error?.message || `${operation} failed`;
};

// 授權診斷組件
const ApprovalDiagnostic: React.FC = () => {
  const { address } = useAccount();
  const { showToast } = useAppToast();
  const { writeContract } = useWriteContract();
  
  // 檢查各種授權狀態
  const soulShardContract = getContract('soulShard', bsc.id);
  const heroContract = getContract('hero', bsc.id);
  const relicContract = getContract('relic', bsc.id);
  const partyContract = getContract('party', bsc.id);
  const altarContract = getContract('altarOfAscension', bsc.id);
  const dungeonMasterContract = getContract('dungeonMaster', bsc.id);
  
  // 檢查 SoulShard 授權
  const { data: soulShardAllowanceToHero } = useReadContract({
    address: soulShardContract?.address,
    abi: soulShardContract?.abi,
    functionName: 'allowance',
    args: [address, heroContract?.address],
    query: { enabled: !!address }
  });
  
  const { data: soulShardAllowanceToRelic } = useReadContract({
    address: soulShardContract?.address,
    abi: soulShardContract?.abi,
    functionName: 'allowance',
    args: [address, relicContract?.address],
    query: { enabled: !!address }
  });
  
  const { data: soulShardAllowanceToParty } = useReadContract({
    address: soulShardContract?.address,
    abi: soulShardContract?.abi,
    functionName: 'allowance',
    args: [address, partyContract?.address],
    query: { enabled: !!address }
  });
  
  const { data: soulShardAllowanceToAltar } = useReadContract({
    address: soulShardContract?.address,
    abi: soulShardContract?.abi,
    functionName: 'allowance',
    args: [address, altarContract?.address],
    query: { enabled: !!address }
  });
  
  // 檢查 NFT 授權
  const { data: heroApprovedToAltar } = useReadContract({
    address: heroContract?.address,
    abi: heroContract?.abi,
    functionName: 'isApprovedForAll',
    args: [address, altarContract?.address],
    query: { enabled: !!address }
  });
  
  const { data: relicApprovedToAltar } = useReadContract({
    address: relicContract?.address,
    abi: relicContract?.abi,
    functionName: 'isApprovedForAll',
    args: [address, altarContract?.address],
    query: { enabled: !!address }
  });
  
  const { data: heroApprovedToParty } = useReadContract({
    address: heroContract?.address,
    abi: heroContract?.abi,
    functionName: 'isApprovedForAll',
    args: [address, partyContract?.address],
    query: { enabled: !!address }
  });
  
  const { data: relicApprovedToParty } = useReadContract({
    address: relicContract?.address,
    abi: relicContract?.abi,
    functionName: 'isApprovedForAll',
    args: [address, relicContract?.address],
    query: { enabled: !!address }
  });
  
  // 修復授權函數
  const fixApproval = async (type: 'soulShard' | 'hero' | 'relic', target: string, targetName: string) => {
    try {
      let contractAddress, abi, functionName, args;
      
      if (type === 'soulShard') {
        contractAddress = soulShardContract?.address;
        abi = soulShardContract?.abi;
        functionName = 'approve';
        args = [target, parseEther('1000000')]; // 授權大量額度
      } else {
        const contract = type === 'hero' ? heroContract : relicContract;
        contractAddress = contract?.address;
        abi = contract?.abi;
        functionName = 'setApprovalForAll';
        args = [target, true];
      }
      
      writeContract({
        address: contractAddress,
        abi: abi,
        functionName: functionName,
        args: args
      });
      
      showToast(`正在修復 ${type} 對 ${targetName} 的授權...`, 'info');
    } catch (error) {
      showToast(handleError(error, `修復 ${type} 授權`), 'error');
    }
  };
  
  const MAX_ALLOWANCE = parseEther('1000000');
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-white mb-4">🔐 授權診斷與修復</h3>
      
      <div className="space-y-4">
        {/* SoulShard 授權狀態 */}
        <div className="border border-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-green-400 mb-3">SoulShard 代幣授權</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">授權給 Hero 合約:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${(soulShardAllowanceToHero || 0n) >= MAX_ALLOWANCE ? 'text-green-400' : 'text-red-400'}`}>
                  {soulShardAllowanceToHero ? formatEther(soulShardAllowanceToHero as bigint) : '0'} SOUL
                </span>
                {(soulShardAllowanceToHero || 0n) < MAX_ALLOWANCE && (
                  <ActionButton
                    onClick={() => fixApproval('soulShard', heroContract?.address!, 'Hero')}
                    className="px-3 py-1 text-xs"
                  >
                    修復
                  </ActionButton>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">授權給 Relic 合約:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${(soulShardAllowanceToRelic || 0n) >= MAX_ALLOWANCE ? 'text-green-400' : 'text-red-400'}`}>
                  {soulShardAllowanceToRelic ? formatEther(soulShardAllowanceToRelic as bigint) : '0'} SOUL
                </span>
                {(soulShardAllowanceToRelic || 0n) < MAX_ALLOWANCE && (
                  <ActionButton
                    onClick={() => fixApproval('soulShard', relicContract?.address!, 'Relic')}
                    className="px-3 py-1 text-xs"
                  >
                    修復
                  </ActionButton>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">授權給 Party 合約:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${(soulShardAllowanceToParty || 0n) >= MAX_ALLOWANCE ? 'text-green-400' : 'text-red-400'}`}>
                  {soulShardAllowanceToParty ? formatEther(soulShardAllowanceToParty as bigint) : '0'} SOUL
                </span>
                {(soulShardAllowanceToParty || 0n) < MAX_ALLOWANCE && (
                  <ActionButton
                    onClick={() => fixApproval('soulShard', partyContract?.address!, 'Party')}
                    className="px-3 py-1 text-xs"
                  >
                    修復
                  </ActionButton>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">授權給 Altar 合約:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${(soulShardAllowanceToAltar || 0n) >= MAX_ALLOWANCE ? 'text-green-400' : 'text-red-400'}`}>
                  {soulShardAllowanceToAltar ? formatEther(soulShardAllowanceToAltar as bigint) : '0'} SOUL
                </span>
                {(soulShardAllowanceToAltar || 0n) < MAX_ALLOWANCE && (
                  <ActionButton
                    onClick={() => fixApproval('soulShard', altarContract?.address!, 'Altar')}
                    className="px-3 py-1 text-xs"
                  >
                    修復
                  </ActionButton>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* NFT 授權狀態 */}
        <div className="border border-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-blue-400 mb-3">NFT 授權</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Hero 授權給 Altar:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${heroApprovedToAltar ? 'text-green-400' : 'text-red-400'}`}>
                  {heroApprovedToAltar ? '✅ 已授權' : '❌ 未授權'}
                </span>
                {!heroApprovedToAltar && (
                  <ActionButton
                    onClick={() => fixApproval('hero', altarContract?.address!, 'Altar')}
                    className="px-3 py-1 text-xs"
                  >
                    修復
                  </ActionButton>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Relic 授權給 Altar:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${relicApprovedToAltar ? 'text-green-400' : 'text-red-400'}`}>
                  {relicApprovedToAltar ? '✅ 已授權' : '❌ 未授權'}
                </span>
                {!relicApprovedToAltar && (
                  <ActionButton
                    onClick={() => fixApproval('relic', altarContract?.address!, 'Altar')}
                    className="px-3 py-1 text-xs"
                  >
                    修復
                  </ActionButton>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Hero 授權給 Party:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${heroApprovedToParty ? 'text-green-400' : 'text-red-400'}`}>
                  {heroApprovedToParty ? '✅ 已授權' : '❌ 未授權'}
                </span>
                {!heroApprovedToParty && (
                  <ActionButton
                    onClick={() => fixApproval('hero', partyContract?.address!, 'Party')}
                    className="px-3 py-1 text-xs"
                  >
                    修復
                  </ActionButton>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Relic 授權給 Party:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${relicApprovedToParty ? 'text-green-400' : 'text-red-400'}`}>
                  {relicApprovedToParty ? '✅ 已授權' : '❌ 未授權'}
                </span>
                {!relicApprovedToParty && (
                  <ActionButton
                    onClick={() => fixApproval('relic', partyContract?.address!, 'Party')}
                    className="px-3 py-1 text-xs"
                  >
                    修復
                  </ActionButton>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 簡潔的合約設定組件
const ContractSettings: React.FC = () => {
  const { address } = useAccount();
  const { showToast } = useAppToast();
  const { writeContract } = useWriteContract();
  
  // 獲取合約實例
  const heroContract = getContract('hero', bsc.id);
  const relicContract = getContract('relic', bsc.id);
  const partyContract = getContract('party', bsc.id);
  const dungeonMasterContract = getContract('dungeonMaster', bsc.id);
  
  // 讀取合約設定
  const contractReads = [
    // Hero 合約設定
    {
      address: heroContract?.address,
      abi: heroContract?.abi,
      functionName: 'platformFee'
    },
    {
      address: heroContract?.address,
      abi: heroContract?.abi,
      functionName: 'mintPriceUSD'
    },
    {
      address: heroContract?.address,
      abi: heroContract?.abi,
      functionName: 'paused'
    },
    // Relic 合約設定
    {
      address: relicContract?.address,
      abi: relicContract?.abi,
      functionName: 'platformFee'
    },
    {
      address: relicContract?.address,
      abi: relicContract?.abi,
      functionName: 'mintPriceUSD'
    },
    {
      address: relicContract?.address,
      abi: relicContract?.abi,
      functionName: 'paused'
    },
    // Party 合約設定
    {
      address: partyContract?.address,
      abi: partyContract?.abi,
      functionName: 'platformFee'
    },
    {
      address: partyContract?.address,
      abi: partyContract?.abi,
      functionName: 'paused'
    },
    // DungeonMaster 設定
    {
      address: dungeonMasterContract?.address,
      abi: dungeonMasterContract?.abi,
      functionName: 'globalRewardMultiplier'
    },
    {
      address: dungeonMasterContract?.address,
      abi: dungeonMasterContract?.abi,
      functionName: 'restCostPowerDivisor'
    },
    {
      address: dungeonMasterContract?.address,
      abi: dungeonMasterContract?.abi,
      functionName: 'paused'
    }
  ];
  
  const { data: contractData, isLoading } = useReadContracts({
    contracts: contractReads,
    query: { 
      enabled: !!address,
      refetchInterval: 10000 // 10秒刷新一次
    }
  });
  
  // 狀態管理
  const [newValues, setNewValues] = useState({
    heroFee: '',
    relicFee: '',
    partyFee: '',
    rewardMultiplier: '',
    restCostDivisor: ''
  });
  
  // 解析合約數據
  const settings = useMemo(() => {
    if (!contractData) return null;
    
    return {
      hero: {
        platformFee: contractData[0]?.result || 0n,
        mintPriceUSD: contractData[1]?.result || 0n,
        paused: contractData[2]?.result || false
      },
      relic: {
        platformFee: contractData[3]?.result || 0n,
        mintPriceUSD: contractData[4]?.result || 0n,
        paused: contractData[5]?.result || false
      },
      party: {
        platformFee: contractData[6]?.result || 0n,
        paused: contractData[7]?.result || false
      },
      dungeonMaster: {
        globalRewardMultiplier: contractData[8]?.result || 0n,
        restCostPowerDivisor: contractData[9]?.result || 0n,
        paused: contractData[10]?.result || false
      }
    };
  }, [contractData]);
  
  // 更新設定函數
  const updateSetting = async (contract: 'hero' | 'relic' | 'party' | 'dungeonMaster', setting: string, value: string) => {
    try {
      let contractAddress, abi, functionName, args;
      
      switch (contract) {
        case 'hero':
          contractAddress = heroContract?.address;
          abi = heroContract?.abi;
          break;
        case 'relic':
          contractAddress = relicContract?.address;
          abi = relicContract?.abi;
          break;
        case 'party':
          contractAddress = partyContract?.address;
          abi = partyContract?.abi;
          break;
        case 'dungeonMaster':
          contractAddress = dungeonMasterContract?.address;
          abi = dungeonMasterContract?.abi;
          break;
      }
      
      switch (setting) {
        case 'platformFee':
          functionName = 'setPlatformFee';
          args = [parseEther(value)];
          break;
        case 'globalRewardMultiplier':
          functionName = 'setGlobalRewardMultiplier';
          args = [BigInt(value)];
          break;
        case 'restCostPowerDivisor':
          functionName = 'setRestCostPowerDivisor';
          args = [BigInt(value)];
          break;
        default:
          throw new Error(`Unsupported setting: ${setting}`);
      }
      
      writeContract({
        address: contractAddress,
        abi: abi,
        functionName: functionName,
        args: args
      });
      
      showToast(`正在更新 ${contract} 的 ${setting}...`, 'info');
    } catch (error) {
      showToast(handleError(error, `更新 ${contract} 設定`), 'error');
    }
  };
  
  // 暫停/恢復合約
  const togglePause = async (contract: 'hero' | 'relic' | 'party' | 'dungeonMaster', isPaused: boolean) => {
    try {
      let contractAddress, abi;
      
      switch (contract) {
        case 'hero':
          contractAddress = heroContract?.address;
          abi = heroContract?.abi;
          break;
        case 'relic':
          contractAddress = relicContract?.address;
          abi = relicContract?.abi;
          break;
        case 'party':
          contractAddress = partyContract?.address;
          abi = partyContract?.abi;
          break;
        case 'dungeonMaster':
          contractAddress = dungeonMasterContract?.address;
          abi = dungeonMasterContract?.abi;
          break;
      }
      
      writeContract({
        address: contractAddress,
        abi: abi,
        functionName: isPaused ? 'unpause' : 'pause',
        args: []
      });
      
      showToast(`正在${isPaused ? '恢復' : '暫停'} ${contract} 合約...`, 'info');
    } catch (error) {
      showToast(handleError(error, `${isPaused ? '恢復' : '暫停'} ${contract} 合約`), 'error');
    }
  };
  
  if (isLoading) return <LoadingSpinner />;
  if (!settings) return <div className="text-red-400">無法加載合約設定</div>;
  
  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-xl font-bold text-white mb-4">⚙️ 合約設定</h3>
      
      <div className="space-y-6">
        {/* Hero 合約設定 */}
        <div className="border border-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-blue-400 mb-3">Hero 合約</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">平台費用:</span>
              <div className="flex items-center space-x-2">
                <span className="text-white">{formatEther(settings.hero.platformFee)} BNB</span>
                <input
                  type="text"
                  placeholder="新費用 (BNB)"
                  value={newValues.heroFee}
                  onChange={(e) => setNewValues({...newValues, heroFee: e.target.value})}
                  className="w-24 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                />
                <ActionButton
                  onClick={() => updateSetting('hero', 'platformFee', newValues.heroFee)}
                  disabled={!newValues.heroFee}
                  className="px-3 py-1 text-xs"
                >
                  更新
                </ActionButton>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">鑄造價格:</span>
              <span className="text-white">{formatEther(settings.hero.mintPriceUSD)} USD</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">合約狀態:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${settings.hero.paused ? 'text-red-400' : 'text-green-400'}`}>
                  {settings.hero.paused ? '⏸️ 已暫停' : '▶️ 運行中'}
                </span>
                <ActionButton
                  onClick={() => togglePause('hero', settings.hero.paused)}
                  className="px-3 py-1 text-xs"
                >
                  {settings.hero.paused ? '恢復' : '暫停'}
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
        
        {/* Relic 合約設定 */}
        <div className="border border-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-purple-400 mb-3">Relic 合約</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">平台費用:</span>
              <div className="flex items-center space-x-2">
                <span className="text-white">{formatEther(settings.relic.platformFee)} BNB</span>
                <input
                  type="text"
                  placeholder="新費用 (BNB)"
                  value={newValues.relicFee}
                  onChange={(e) => setNewValues({...newValues, relicFee: e.target.value})}
                  className="w-24 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                />
                <ActionButton
                  onClick={() => updateSetting('relic', 'platformFee', newValues.relicFee)}
                  disabled={!newValues.relicFee}
                  className="px-3 py-1 text-xs"
                >
                  更新
                </ActionButton>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">鑄造價格:</span>
              <span className="text-white">{formatEther(settings.relic.mintPriceUSD)} USD</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">合約狀態:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${settings.relic.paused ? 'text-red-400' : 'text-green-400'}`}>
                  {settings.relic.paused ? '⏸️ 已暫停' : '▶️ 運行中'}
                </span>
                <ActionButton
                  onClick={() => togglePause('relic', settings.relic.paused)}
                  className="px-3 py-1 text-xs"
                >
                  {settings.relic.paused ? '恢復' : '暫停'}
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
        
        {/* DungeonMaster 合約設定 */}
        <div className="border border-gray-700 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-green-400 mb-3">DungeonMaster 合約</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">全域獎勵倍率:</span>
              <div className="flex items-center space-x-2">
                <span className="text-white">{Number(settings.dungeonMaster.globalRewardMultiplier) / 10}%</span>
                <input
                  type="number"
                  placeholder="新倍率 (整數)"
                  value={newValues.rewardMultiplier}
                  onChange={(e) => setNewValues({...newValues, rewardMultiplier: e.target.value})}
                  className="w-24 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                />
                <ActionButton
                  onClick={() => updateSetting('dungeonMaster', 'globalRewardMultiplier', newValues.rewardMultiplier)}
                  disabled={!newValues.rewardMultiplier}
                  className="px-3 py-1 text-xs"
                >
                  更新
                </ActionButton>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">休息費用除數:</span>
              <div className="flex items-center space-x-2">
                <span className="text-white">{Number(settings.dungeonMaster.restCostPowerDivisor)}</span>
                <input
                  type="number"
                  placeholder="新除數"
                  value={newValues.restCostDivisor}
                  onChange={(e) => setNewValues({...newValues, restCostDivisor: e.target.value})}
                  className="w-24 px-2 py-1 bg-gray-700 text-white rounded text-sm"
                />
                <ActionButton
                  onClick={() => updateSetting('dungeonMaster', 'restCostPowerDivisor', newValues.restCostDivisor)}
                  disabled={!newValues.restCostDivisor}
                  className="px-3 py-1 text-xs"
                >
                  更新
                </ActionButton>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-300">合約狀態:</span>
              <div className="flex items-center space-x-2">
                <span className={`text-sm ${settings.dungeonMaster.paused ? 'text-red-400' : 'text-green-400'}`}>
                  {settings.dungeonMaster.paused ? '⏸️ 已暫停' : '▶️ 運行中'}
                </span>
                <ActionButton
                  onClick={() => togglePause('dungeonMaster', settings.dungeonMaster.paused)}
                  className="px-3 py-1 text-xs"
                >
                  {settings.dungeonMaster.paused ? '恢復' : '暫停'}
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 主要的管理後台組件
const AdminPageV2: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'settings' | 'approval' | 'funds'>('settings');
  
  // 開發者地址從環境變數讀取
  const DEVELOPER_ADDRESS = import.meta.env.VITE_DEVELOPER_ADDRESS;
  
  // 權限檢查
  const isAdmin = useMemo(() => {
    if (!address || !DEVELOPER_ADDRESS) return false;
    return address.toLowerCase() === DEVELOPER_ADDRESS.toLowerCase();
  }, [address, DEVELOPER_ADDRESS]);
  
  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">🔧 管理後台</h1>
          <p className="text-gray-400">請先連接錢包</p>
        </div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">🔧 管理後台</h1>
          <p className="text-red-400">您沒有管理員權限</p>
          <p className="text-gray-400 text-sm mt-2">當前地址: {address}</p>
          <p className="text-gray-400 text-sm">管理員地址: {DEVELOPER_ADDRESS}</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">🔧 管理後台 V2</h1>
        <p className="text-gray-400">簡潔版本 - 無循環依賴</p>
      </div>
      
      {/* 標籤導航 */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          合約設定
        </button>
        <button
          onClick={() => setActiveTab('approval')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'approval'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          授權診斷
        </button>
        <button
          onClick={() => setActiveTab('funds')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'funds'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          資金管理
        </button>
      </div>
      
      {/* 內容區域 */}
      <div className="space-y-6">
        {activeTab === 'settings' && <ContractSettings />}
        {activeTab === 'approval' && <ApprovalDiagnostic />}
        {activeTab === 'funds' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4">💰 資金管理</h3>
            <p className="text-gray-400">資金提取功能開發中...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPageV2;