// src/components/ApprovalHelper.tsx - 授權修復輔助組件

import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract } from '../config/contracts';
import { useAppToast } from '../contexts/SimpleToastContext';
import { ActionButton } from './ui/ActionButton';
import { logger } from '../utils/logger';

interface ApprovalHelperProps {
  className?: string;
}

export const ApprovalHelper: React.FC<ApprovalHelperProps> = ({ className = '' }) => {
  const { address } = useAccount();
  const { showToast } = useAppToast();
  const { writeContract } = useWriteContract();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  
  // 獲取合約實例
  const soulShardContract = getContractWithABI(bsc.id, 'soulShard');
  const heroContract = getContractWithABI(bsc.id, 'hero');
  const relicContract = getContractWithABI(bsc.id, 'relic');
  const partyContract = getContractWithABI(bsc.id, 'party');
  const altarContract = getContractWithABI(bsc.id, 'altarOfAscension');
  
  // 檢查 SoulShard 授權
  const { data: soulShardAllowanceToHero } = useReadContract({
    address: soulShardContract?.address,
    abi: soulShardContract?.abi,
    functionName: 'allowance',
    args: [address, heroContract?.address],
    query: { enabled: !!address && isExpanded }
  });
  
  const { data: soulShardAllowanceToRelic } = useReadContract({
    address: soulShardContract?.address,
    abi: soulShardContract?.abi,
    functionName: 'allowance',
    args: [address, relicContract?.address],
    query: { enabled: !!address && isExpanded }
  });
  
  const { data: soulShardAllowanceToParty } = useReadContract({
    address: soulShardContract?.address,
    abi: soulShardContract?.abi,
    functionName: 'allowance',
    args: [address, partyContract?.address],
    query: { enabled: !!address && isExpanded }
  });
  
  const { data: soulShardAllowanceToAltar } = useReadContract({
    address: soulShardContract?.address,
    abi: soulShardContract?.abi,
    functionName: 'allowance',
    args: [address, altarContract?.address],
    query: { enabled: !!address && isExpanded }
  });
  
  // 檢查 NFT 授權
  const { data: heroApprovedToAltar } = useReadContract({
    address: heroContract?.address,
    abi: heroContract?.abi,
    functionName: 'isApprovedForAll',
    args: [address, altarContract?.address],
    query: { enabled: !!address && isExpanded }
  });
  
  const { data: relicApprovedToAltar } = useReadContract({
    address: relicContract?.address,
    abi: relicContract?.abi,
    functionName: 'isApprovedForAll',
    args: [address, altarContract?.address],
    query: { enabled: !!address && isExpanded }
  });
  
  const { data: heroApprovedToParty } = useReadContract({
    address: heroContract?.address,
    abi: heroContract?.abi,
    functionName: 'isApprovedForAll',
    args: [address, partyContract?.address],
    query: { enabled: !!address && isExpanded }
  });
  
  const { data: relicApprovedToParty } = useReadContract({
    address: relicContract?.address,
    abi: relicContract?.abi,
    functionName: 'isApprovedForAll',
    args: [address, partyContract?.address],
    query: { enabled: !!address && isExpanded }
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
      
      showToast(`正在修復 ${type === 'soulShard' ? 'SoulShard' : type === 'hero' ? 'Hero' : 'Relic'} 對 ${targetName} 的授權...`, 'info');
    } catch (error: any) {
      logger.error(`修復 ${type} 授權失敗:`, error);
      showToast(`修復 ${type} 授權失敗: ${error.message || '未知錯誤'}`, 'error');
    }
  };
  
  // 一鍵修復所有授權
  const fixAllApprovals = async () => {
    setIsChecking(true);
    try {
      showToast('正在修復所有授權...', 'info');
      
      // 修復 SoulShard 授權
      if (heroContract?.address) {
        await fixApproval('soulShard', heroContract.address, 'Hero');
      }
      if (relicContract?.address) {
        await fixApproval('soulShard', relicContract.address, 'Relic');
      }
      if (partyContract?.address) {
        await fixApproval('soulShard', partyContract.address, 'Party');
      }
      if (altarContract?.address) {
        await fixApproval('soulShard', altarContract.address, 'Altar');
      }
      
      // 修復 NFT 授權
      if (altarContract?.address) {
        await fixApproval('hero', altarContract.address, 'Altar');
        await fixApproval('relic', altarContract.address, 'Altar');
      }
      if (partyContract?.address) {
        await fixApproval('hero', partyContract.address, 'Party');
        await fixApproval('relic', partyContract.address, 'Party');
      }
      
      showToast('所有授權修復請求已發送，請在錢包中確認交易', 'success');
    } catch (error: any) {
      logger.error('一鍵修復授權失敗:', error);
      showToast(`一鍵修復授權失敗: ${error.message || '未知錯誤'}`, 'error');
    } finally {
      setIsChecking(false);
    }
  };
  
  const MAX_ALLOWANCE = parseEther('1000000');
  
  // 檢查是否需要修復
  const needsRepair = 
    (soulShardAllowanceToHero || 0n) < MAX_ALLOWANCE ||
    (soulShardAllowanceToRelic || 0n) < MAX_ALLOWANCE ||
    (soulShardAllowanceToParty || 0n) < MAX_ALLOWANCE ||
    (soulShardAllowanceToAltar || 0n) < MAX_ALLOWANCE ||
    !heroApprovedToAltar ||
    !relicApprovedToAltar ||
    !heroApprovedToParty ||
    !relicApprovedToParty;
  
  if (!address) return null;
  
  return (
    <div className={`bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-lg border border-blue-500/30 ${className}`}>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <h3 className="text-lg font-semibold text-white">🔐 授權助手</h3>
            {needsRepair && (
              <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">
                需要修復
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <ActionButton
              onClick={fixAllApprovals}
              disabled={isChecking}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700"
            >
              {isChecking ? '修復中...' : '一鍵修復'}
            </ActionButton>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {isExpanded ? '收起' : '展開'}
            </button>
          </div>
        </div>
        
        <p className="text-gray-300 text-sm mt-2">
          {isExpanded ? '檢查並修復所有必要的授權設定' : '點擊「一鍵修復」自動設定所有授權'}
        </p>
      </div>
      
      {isExpanded && (
        <div className="border-t border-blue-500/30 p-4">
          <div className="space-y-4">
            {/* SoulShard 授權狀態 */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-green-400 mb-3">💎 SoulShard 代幣授權</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Hero 合約:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`${(soulShardAllowanceToHero || 0n) >= MAX_ALLOWANCE ? 'text-green-400' : 'text-red-400'}`}>
                      {soulShardAllowanceToHero ? formatEther(soulShardAllowanceToHero as bigint) : '0'} SOUL
                    </span>
                    {(soulShardAllowanceToHero || 0n) < MAX_ALLOWANCE && (
                      <ActionButton
                        onClick={() => heroContract?.address && fixApproval('soulShard', heroContract.address, 'Hero')}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700"
                      >
                        修復
                      </ActionButton>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Relic 合約:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`${(soulShardAllowanceToRelic || 0n) >= MAX_ALLOWANCE ? 'text-green-400' : 'text-red-400'}`}>
                      {soulShardAllowanceToRelic ? formatEther(soulShardAllowanceToRelic as bigint) : '0'} SOUL
                    </span>
                    {(soulShardAllowanceToRelic || 0n) < MAX_ALLOWANCE && (
                      <ActionButton
                        onClick={() => relicContract?.address && fixApproval('soulShard', relicContract.address, 'Relic')}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700"
                      >
                        修復
                      </ActionButton>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Party 合約:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`${(soulShardAllowanceToParty || 0n) >= MAX_ALLOWANCE ? 'text-green-400' : 'text-red-400'}`}>
                      {soulShardAllowanceToParty ? formatEther(soulShardAllowanceToParty as bigint) : '0'} SOUL
                    </span>
                    {(soulShardAllowanceToParty || 0n) < MAX_ALLOWANCE && (
                      <ActionButton
                        onClick={() => partyContract?.address && fixApproval('soulShard', partyContract.address, 'Party')}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700"
                      >
                        修復
                      </ActionButton>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Altar 合約:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`${(soulShardAllowanceToAltar || 0n) >= MAX_ALLOWANCE ? 'text-green-400' : 'text-red-400'}`}>
                      {soulShardAllowanceToAltar ? formatEther(soulShardAllowanceToAltar as bigint) : '0'} SOUL
                    </span>
                    {(soulShardAllowanceToAltar || 0n) < MAX_ALLOWANCE && (
                      <ActionButton
                        onClick={() => altarContract?.address && fixApproval('soulShard', altarContract.address, 'Altar')}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700"
                      >
                        修復
                      </ActionButton>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* NFT 授權狀態 */}
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-md font-semibold text-blue-400 mb-3">🎭 NFT 授權</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Hero → Altar:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`${heroApprovedToAltar ? 'text-green-400' : 'text-red-400'}`}>
                      {heroApprovedToAltar ? '✅ 已授權' : '❌ 未授權'}
                    </span>
                    {!heroApprovedToAltar && (
                      <ActionButton
                        onClick={() => altarContract?.address && fixApproval('hero', altarContract.address, 'Altar')}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700"
                      >
                        修復
                      </ActionButton>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Relic → Altar:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`${relicApprovedToAltar ? 'text-green-400' : 'text-red-400'}`}>
                      {relicApprovedToAltar ? '✅ 已授權' : '❌ 未授權'}
                    </span>
                    {!relicApprovedToAltar && (
                      <ActionButton
                        onClick={() => altarContract?.address && fixApproval('relic', altarContract.address, 'Altar')}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700"
                      >
                        修復
                      </ActionButton>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Hero → Party:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`${heroApprovedToParty ? 'text-green-400' : 'text-red-400'}`}>
                      {heroApprovedToParty ? '✅ 已授權' : '❌ 未授權'}
                    </span>
                    {!heroApprovedToParty && (
                      <ActionButton
                        onClick={() => partyContract?.address && fixApproval('hero', partyContract.address, 'Party')}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700"
                      >
                        修復
                      </ActionButton>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">Relic → Party:</span>
                  <div className="flex items-center space-x-2">
                    <span className={`${relicApprovedToParty ? 'text-green-400' : 'text-red-400'}`}>
                      {relicApprovedToParty ? '✅ 已授權' : '❌ 未授權'}
                    </span>
                    {!relicApprovedToParty && (
                      <ActionButton
                        onClick={() => partyContract?.address && fixApproval('relic', partyContract.address, 'Party')}
                        className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700"
                      >
                        修復
                      </ActionButton>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-300 text-sm">
                💡 <strong>提示：</strong>授權是一次性設定，完成後您就可以正常使用所有遊戲功能，包括鑄造、升級、組隊和探索。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalHelper;