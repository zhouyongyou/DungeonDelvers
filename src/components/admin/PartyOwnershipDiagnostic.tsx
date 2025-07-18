// src/components/admin/PartyOwnershipDiagnostic.tsx - 隊伍擁有權診斷組件

import React, { useState } from 'react';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { partyOwnershipChecker } from '../../utils/partyOwnershipChecker';
import { isAddress } from 'viem';
import { logger } from '../../utils/logger';

const PartyOwnershipDiagnostic: React.FC = () => {
  const [userAddress, setUserAddress] = useState('0x10925A7138649C7E1794CE646182eeb5BF8ba647');
  const [partyId, setPartyId] = useState('1');
  const [diagnosticResult, setDiagnosticResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    if (!isAddress(userAddress)) {
      logger.error('無效的用戶地址');
      return;
    }

    setIsRunning(true);
    setDiagnosticResult(null);

    try {
      const result = await partyOwnershipChecker.generateDiagnosticReport(
        userAddress,
        BigInt(partyId)
      );
      
      setDiagnosticResult(result);
      logger.info('隊伍擁有權診斷完成:', result);
      
    } catch (error) {
      logger.error('診斷過程中發生錯誤:', error);
      setDiagnosticResult({
        summary: '❌ 診斷失敗',
        details: {},
        recommendations: [`診斷失敗: ${error instanceof Error ? error.message : '未知錯誤'}`]
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-4">🔍 隊伍擁有權診斷</h3>
        <p className="text-gray-300 text-sm mb-4">
          檢查用戶是否真正擁有指定隊伍，診斷交易失敗的原因。
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">用戶地址</label>
            <input
              type="text"
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">隊伍 ID</label>
            <input
              type="number"
              value={partyId}
              onChange={(e) => setPartyId(e.target.value)}
              min="1"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
        </div>

        <ActionButton
          onClick={runDiagnostic}
          isLoading={isRunning}
          disabled={!userAddress || !partyId}
          className="w-full h-12"
        >
          {isRunning ? (
            <>
              <LoadingSpinner size="h-5 w-5" />
              <span className="ml-2">診斷中...</span>
            </>
          ) : (
            '開始診斷'
          )}
        </ActionButton>
      </div>

      {diagnosticResult && (
        <div className="space-y-4">
          {/* 診斷摘要 */}
          <div className={`p-4 rounded-lg border-2 ${
            diagnosticResult.summary.includes('✅') 
              ? 'bg-green-900/20 border-green-500' 
              : 'bg-red-900/20 border-red-500'
          }`}>
            <h4 className={`font-bold text-lg mb-2 ${
              diagnosticResult.summary.includes('✅') ? 'text-green-400' : 'text-red-400'
            }`}>
              {diagnosticResult.summary}
            </h4>
          </div>

          {/* 詳細信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 隊伍擁有權檢查 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h5 className="font-semibold text-white mb-2">👤 隊伍擁有權</h5>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-300">是否擁有隊伍 {partyId}:</span>
                  <span className={diagnosticResult.details.partyOwnership?.isOwner ? 'text-green-400' : 'text-red-400'}>
                    {diagnosticResult.details.partyOwnership?.isOwner ? '✅ 是' : '❌ 否'}
                  </span>
                </div>
                {diagnosticResult.details.partyOwnership?.actualOwner && (
                  <div>
                    <span className="text-gray-300">實際擁有者: </span>
                    <span className="text-blue-400 font-mono text-xs break-all">
                      {diagnosticResult.details.partyOwnership.actualOwner}
                    </span>
                  </div>
                )}
                {diagnosticResult.details.partyOwnership?.error && (
                  <div className="text-red-400 text-xs">
                    錯誤: {diagnosticResult.details.partyOwnership.error}
                  </div>
                )}
              </div>
            </div>

            {/* 用戶擁有的隊伍 */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h5 className="font-semibold text-white mb-2">🎯 用戶隊伍</h5>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-gray-300">擁有隊伍數量: </span>
                  <span className="text-yellow-400">
                    {diagnosticResult.details.userParties?.partyIds?.length || 0}
                  </span>
                </div>
                {diagnosticResult.details.userParties?.partyIds?.length > 0 && (
                  <div>
                    <span className="text-gray-300">隊伍 ID: </span>
                    <span className="text-blue-400">
                      {diagnosticResult.details.userParties.partyIds.map((id: bigint) => `#${id}`).join(', ')}
                    </span>
                  </div>
                )}
                {diagnosticResult.details.userParties?.error && (
                  <div className="text-red-400 text-xs">
                    錯誤: {diagnosticResult.details.userParties.error}
                  </div>
                )}
              </div>
            </div>

            {/* DungeonCore 配置 */}
            <div className="bg-gray-800 p-4 rounded-lg md:col-span-2">
              <h5 className="font-semibold text-white mb-2">⚙️ DungeonCore 配置</h5>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-300">PartyContract 已設置:</span>
                  <span className={diagnosticResult.details.dungeonCorePartyContract?.isSet ? 'text-green-400' : 'text-red-400'}>
                    {diagnosticResult.details.dungeonCorePartyContract?.isSet ? '✅ 已設置' : '❌ 未設置'}
                  </span>
                </div>
                {diagnosticResult.details.dungeonCorePartyContract?.partyContractAddress && (
                  <div>
                    <span className="text-gray-300">PartyContract 地址: </span>
                    <span className="text-blue-400 font-mono text-xs break-all">
                      {diagnosticResult.details.dungeonCorePartyContract.partyContractAddress}
                    </span>
                  </div>
                )}
                {diagnosticResult.details.dungeonCorePartyContract?.error && (
                  <div className="text-red-400 text-xs">
                    錯誤: {diagnosticResult.details.dungeonCorePartyContract.error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 建議 */}
          {diagnosticResult.recommendations && diagnosticResult.recommendations.length > 0 && (
            <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500">
              <h5 className="font-semibold text-blue-400 mb-2">💡 診斷建議</h5>
              <ul className="text-sm text-blue-300 space-y-1">
                {diagnosticResult.recommendations.map((rec: string, index: number) => (
                  <li key={index}>• {rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PartyOwnershipDiagnostic;