// src/components/admin/ProvisionsDiagnosticPanel.tsx - 購買儲備診斷面板

import React, { useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { ActionButton } from '../ui/ActionButton';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { bsc } from 'wagmi/chains';
import { provisionsDiagnostic, type ProvisionsDiagnosticResult } from '../../utils/provisionsDiagnostic';
import { contractChecker } from '../../utils/contractChecker';
import { logger } from '../../utils/logger';
import { isAddress } from 'viem';

const ProvisionsDiagnosticPanel: React.FC = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: bsc.id });
  
  const [diagnosticResult, setDiagnosticResult] = useState<ProvisionsDiagnosticResult | null>(null);
  const [contractCheckResult, setContractCheckResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunningContractCheck, setIsRunningContractCheck] = useState(false);
  const [userAddress, setUserAddress] = useState(address || '');
  const [partyId, setPartyId] = useState('1');
  const [quantity, setQuantity] = useState(1);

  const runDiagnostic = async () => {
    if (!isAddress(userAddress)) {
      logger.error('無效的用戶地址');
      return;
    }
    
    if (!publicClient) {
      logger.error('Public client 未初始化');
      return;
    }

    setIsRunning(true);
    setDiagnosticResult(null);

    try {
      const result = await provisionsDiagnostic.diagnoseProvisionsPurchase(
        userAddress,
        BigInt(partyId),
        quantity,
        publicClient
      );
      
      setDiagnosticResult(result);
      
      // 輸出格式化結果到控制台
      const formattedResult = provisionsDiagnostic.formatDiagnosticResult(result);
      logger.info('購買儲備診斷完成:\n' + formattedResult);
      
    } catch (error) {
      logger.error('診斷過程中發生錯誤:', error);
      setDiagnosticResult({
        success: false,
        issues: [`診斷失敗: ${error instanceof Error ? error.message : '未知錯誤'}`],
        warnings: [],
        contractAddresses: { dungeonMaster: '', dungeonCore: '', soulShard: '' },
        contractStates: {},
        userStates: {},
        recommendations: ['請檢查網路連接和合約地址配置']
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runContractCheck = async () => {
    setIsRunningContractCheck(true);
    setContractCheckResult(null);

    try {
      const result = await contractChecker.runFullCheck();
      setContractCheckResult(result);
      
      logger.info('合約狀態檢查結果:', result);
      
      // 如果用戶地址和隊伍ID都設置了，也進行模擬調用
      if (userAddress && isAddress(userAddress) && partyId) {
        try {
          const simulationResult = await contractChecker.simulateBuyProvisions(
            userAddress,
            BigInt(partyId),
            BigInt(quantity)
          );
          logger.info('模擬調用結果:', simulationResult);
        } catch (error) {
          logger.error('模擬調用失敗:', error);
        }
      }
      
    } catch (error) {
      logger.error('合約檢查失敗:', error);
      setContractCheckResult({
        allChecksPass: false,
        issues: [`檢查失敗: ${error instanceof Error ? error.message : '未知錯誤'}`]
      });
    } finally {
      setIsRunningContractCheck(false);
    }
  };

  const renderDiagnosticResult = () => {
    if (!diagnosticResult) return null;

    return (
      <div className="mt-6 space-y-4">
        <div className={`p-4 rounded-lg border-2 ${
          diagnosticResult.success 
            ? 'bg-green-900/20 border-green-500' 
            : 'bg-red-900/20 border-red-500'
        }`}>
          <h4 className={`font-bold text-lg mb-2 ${
            diagnosticResult.success ? 'text-green-400' : 'text-red-400'
          }`}>
            診斷結果: {diagnosticResult.success ? '✅ 通過' : '❌ 失敗'}
          </h4>
        </div>

        {/* 合約地址 */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h5 className="font-semibold text-white mb-2">📋 合約地址</h5>
          <div className="text-sm text-gray-300 space-y-1">
            <div>DungeonMaster: <code className="text-blue-400">{diagnosticResult.contractAddresses.dungeonMaster}</code></div>
            <div>DungeonCore: <code className="text-blue-400">{diagnosticResult.contractAddresses.dungeonCore}</code></div>
            <div>SoulShard: <code className="text-blue-400">{diagnosticResult.contractAddresses.soulShard}</code></div>
          </div>
        </div>

        {/* 合約狀態 */}
        {Object.keys(diagnosticResult.contractStates).length > 0 && (
          <div className="bg-gray-800 p-4 rounded-lg">
            <h5 className="font-semibold text-white mb-2">⚙️ 合約狀態</h5>
            <div className="text-sm text-gray-300 space-y-1">
              {diagnosticResult.contractStates.dungeonMasterPaused !== undefined && (
                <div>合約暫停: <span className={diagnosticResult.contractStates.dungeonMasterPaused ? 'text-red-400' : 'text-green-400'}>
                  {diagnosticResult.contractStates.dungeonMasterPaused ? '是' : '否'}
                </span></div>
              )}
              {diagnosticResult.contractStates.provisionPriceUSD && (
                <div>儲備價格: <span className="text-yellow-400">{diagnosticResult.contractStates.provisionPriceUSD.toString()} USD</span></div>
              )}
              {diagnosticResult.contractStates.requiredAmount && (
                <div>所需 SoulShard: <span className="text-yellow-400">{diagnosticResult.contractStates.requiredAmount.toString()}</span></div>
              )}
            </div>
          </div>
        )}

        {/* 用戶狀態 */}
        {Object.keys(diagnosticResult.userStates).length > 0 && (
          <div className="bg-gray-800 p-4 rounded-lg">
            <h5 className="font-semibold text-white mb-2">👤 用戶狀態</h5>
            <div className="text-sm text-gray-300 space-y-1">
              {diagnosticResult.userStates.walletBalance !== undefined && (
                <div>錢包餘額: <span className="text-green-400">{diagnosticResult.userStates.walletBalance.toString()}</span></div>
              )}
              {diagnosticResult.userStates.allowance !== undefined && (
                <div>授權額度: <span className="text-blue-400">{diagnosticResult.userStates.allowance.toString()}</span></div>
              )}
              {diagnosticResult.userStates.needsApproval !== undefined && (
                <div>需要授權: <span className={diagnosticResult.userStates.needsApproval ? 'text-red-400' : 'text-green-400'}>
                  {diagnosticResult.userStates.needsApproval ? '是' : '否'}
                </span></div>
              )}
            </div>
          </div>
        )}

        {/* 問題列表 */}
        {diagnosticResult.issues.length > 0 && (
          <div className="bg-red-900/20 p-4 rounded-lg border border-red-500">
            <h5 className="font-semibold text-red-400 mb-2">❌ 發現問題</h5>
            <ul className="text-sm text-red-300 space-y-1">
              {diagnosticResult.issues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 警告列表 */}
        {diagnosticResult.warnings.length > 0 && (
          <div className="bg-yellow-900/20 p-4 rounded-lg border border-yellow-500">
            <h5 className="font-semibold text-yellow-400 mb-2">⚠️ 警告</h5>
            <ul className="text-sm text-yellow-300 space-y-1">
              {diagnosticResult.warnings.map((warning, index) => (
                <li key={index}>• {warning}</li>
              ))}
            </ul>
          </div>
        )}

        {/* 建議列表 */}
        {diagnosticResult.recommendations.length > 0 && (
          <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-500">
            <h5 className="font-semibold text-blue-400 mb-2">💡 建議</h5>
            <ul className="text-sm text-blue-300 space-y-1">
              {diagnosticResult.recommendations.map((rec, index) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-bold text-white mb-4">🔍 購買儲備診斷工具</h3>
        <p className="text-gray-300 text-sm mb-4">
          此工具可以檢查購買儲備功能可能失敗的原因，包括合約狀態、用戶餘額、授權等。
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">用戶地址</label>
            <input
              type="text"
              value={userAddress}
              onChange={(e) => setUserAddress(e.target.value)}
              placeholder="0x..."
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">購買數量</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min="1"
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <ActionButton
            onClick={runDiagnostic}
            isLoading={isRunning}
            disabled={!userAddress || !partyId}
            className="flex-1 h-12"
          >
            {isRunning ? (
              <>
                <LoadingSpinner size="h-5 w-5" />
                <span className="ml-2">診斷中...</span>
              </>
            ) : (
              '完整診斷'
            )}
          </ActionButton>
          
          <ActionButton
            onClick={runContractCheck}
            isLoading={isRunningContractCheck}
            className="flex-1 h-12 bg-blue-600 hover:bg-blue-500"
          >
            {isRunningContractCheck ? (
              <>
                <LoadingSpinner size="h-5 w-5" />
                <span className="ml-2">檢查中...</span>
              </>
            ) : (
              '快速檢查合約'
            )}
          </ActionButton>
        </div>
      </div>

      {renderDiagnosticResult()}
      
      {/* 合約檢查結果 */}
      {contractCheckResult && (
        <div className="mt-6 space-y-4">
          <h4 className="text-lg font-semibold text-white">⚙️ 合約狀態檢查結果</h4>
          
          <div className={`p-4 rounded-lg border-2 ${
            contractCheckResult.allChecksPass 
              ? 'bg-green-900/20 border-green-500' 
              : 'bg-red-900/20 border-red-500'
          }`}>
            <div className={`font-bold text-lg mb-2 ${
              contractCheckResult.allChecksPass ? 'text-green-400' : 'text-red-400'
            }`}>
              {contractCheckResult.allChecksPass ? '✅ 合約配置正常' : '❌ 合約配置有問題'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg">
              <h5 className="font-semibold text-white mb-2">🔧 核心配置</h5>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-300">SoulShard 設置:</span>
                  <span className={contractCheckResult.soulShardTokenSet ? 'text-green-400' : 'text-red-400'}>
                    {contractCheckResult.soulShardTokenSet ? '✅ 已設置' : '❌ 未設置'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">DungeonCore 設置:</span>
                  <span className={contractCheckResult.dungeonCoreSet ? 'text-green-400' : 'text-red-400'}>
                    {contractCheckResult.dungeonCoreSet ? '✅ 已設置' : '❌ 未設置'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">DungeonStorage 設置:</span>
                  <span className={contractCheckResult.dungeonStorageSet ? 'text-green-400' : 'text-red-400'}>
                    {contractCheckResult.dungeonStorageSet ? '✅ 已設置' : '❌ 未設置'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">合約狀態:</span>
                  <span className={!contractCheckResult.isPaused ? 'text-green-400' : 'text-red-400'}>
                    {!contractCheckResult.isPaused ? '✅ 正常運行' : '❌ 已暫停'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <h5 className="font-semibold text-white mb-2">📊 價格配置</h5>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-gray-300">儲備價格: </span>
                  <span className="text-yellow-400 font-mono">{contractCheckResult.provisionPriceUSD}</span>
                </div>
                <div>
                  <span className="text-gray-300">SoulShard 地址: </span>
                  <span className="text-blue-400 font-mono text-xs">
                    {contractCheckResult.soulShardToken || 'Not Set'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-300">DungeonCore 地址: </span>
                  <span className="text-blue-400 font-mono text-xs">
                    {contractCheckResult.dungeonCoreAddress || 'Not Set'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-300">DungeonStorage 地址: </span>
                  <span className="text-blue-400 font-mono text-xs">
                    {contractCheckResult.dungeonStorageAddress || 'Not Set'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {contractCheckResult.issues && contractCheckResult.issues.length > 0 && (
            <div className="bg-red-900/20 p-4 rounded-lg border border-red-500">
              <h5 className="font-semibold text-red-400 mb-2">❌ 發現問題</h5>
              <ul className="text-sm text-red-300 space-y-1">
                {contractCheckResult.issues.map((issue: string, index: number) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProvisionsDiagnosticPanel;