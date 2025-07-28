// ExpeditionTestComponent.tsx - 出征交易測試組件
import React, { useState } from 'react';
import { useReadContract, useWriteContract, useSimulateContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContract } from '../../config/contracts';
import { logger } from '../../utils/logger';

export const ExpeditionTestComponent: React.FC = () => {
    const [testPartyId, setTestPartyId] = useState<string>('1');
    const [testDungeonId, setTestDungeonId] = useState<string>('1');
    const [testResults, setTestResults] = useState<any[]>([]);

    const dungeonMasterContract = getContract('DUNGEONMASTER');
    const dungeonStorageContract = getContract('DUNGEONSTORAGE');
    const dungeonCoreContract = getContract('DUNGEONCORE');

    // 1. 檢查探索費用
    const { data: explorationFee } = useReadContract({
        address: dungeonMasterContract?.address as `0x${string}`,
        abi: [{"inputs":[],"name":"explorationFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}],
        functionName: 'explorationFee',
    });

    // 2. 檢查隊伍狀態
    const { data: partyStatus } = useReadContract({
        address: dungeonStorageContract?.address as `0x${string}`,
        abi: [{"inputs":[{"internalType":"uint256","name":"partyId","type":"uint256"}],"name":"getPartyStatus","outputs":[{"components":[{"internalType":"uint256","name":"provisionsRemaining","type":"uint256"},{"internalType":"uint256","name":"cooldownEndsAt","type":"uint256"},{"internalType":"uint256","name":"unclaimedRewards","type":"uint256"},{"internalType":"uint8","name":"fatigueLevel","type":"uint8"}],"internalType":"struct IDungeonStorage.PartyStatus","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}],
        functionName: 'getPartyStatus',
        args: [BigInt(testPartyId)],
    });

    // 3. 檢查地下城信息
    const { data: dungeonInfo } = useReadContract({
        address: dungeonStorageContract?.address as `0x${string}`,
        abi: [{"inputs":[{"internalType":"uint256","name":"dungeonId","type":"uint256"}],"name":"getDungeon","outputs":[{"components":[{"internalType":"uint256","name":"requiredPower","type":"uint256"},{"internalType":"uint256","name":"rewardAmountUSD","type":"uint256"},{"internalType":"uint8","name":"baseSuccessRate","type":"uint8"},{"internalType":"bool","name":"isInitialized","type":"bool"}],"internalType":"struct IDungeonStorage.Dungeon","name":"","type":"tuple"}],"stateMutability":"view","type":"function"}],
        functionName: 'getDungeon',
        args: [BigInt(testDungeonId)],
    });

    // 4. 檢查隊伍戰力
    const { data: partyComposition } = useReadContract({
        address: dungeonCoreContract?.address as `0x${string}`,
        abi: [{"inputs":[],"name":"partyContractAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}],
        functionName: 'partyContractAddress',
    });

    const { data: partyPower } = useReadContract({
        address: partyComposition as `0x${string}`,
        abi: [{"inputs":[{"internalType":"uint256","name":"partyId","type":"uint256"}],"name":"getPartyComposition","outputs":[{"internalType":"uint256","name":"totalPower","type":"uint256"},{"internalType":"uint256","name":"totalCapacity","type":"uint256"}],"stateMutability":"view","type":"function"}],
        functionName: 'getPartyComposition',
        args: [BigInt(testPartyId)],
        query: { enabled: !!partyComposition }
    });

    // 5. 模擬交易
    const { data: simulationResult, error: simulationError } = useSimulateContract({
        address: dungeonMasterContract?.address as `0x${string}`,
        abi: [{"inputs":[{"internalType":"uint256","name":"_partyId","type":"uint256"},{"internalType":"uint256","name":"_dungeonId","type":"uint256"}],"name":"requestExpedition","outputs":[],"stateMutability":"payable","type":"function"}],
        functionName: 'requestExpedition',
        args: [BigInt(testPartyId), BigInt(testDungeonId)],
        value: explorationFee || 0n,
        query: { enabled: !!explorationFee }
    });

    // 6. 實際交易
    const { writeContract, isPending, error: writeError } = useWriteContract();

    const runTests = () => {
        const results = [];
        
        // 測試 1: 探索費用
        results.push({
            test: '探索費用',
            status: explorationFee ? '✅' : '❌',
            value: explorationFee ? formatEther(explorationFee) + ' BNB' : '無法獲取',
        });

        // 測試 2: 隊伍狀態
        results.push({
            test: '隊伍狀態',
            status: partyStatus ? '✅' : '❌',
            value: partyStatus ? {
                冷卻結束時間: new Date(Number((partyStatus as any).cooldownEndsAt || 0) * 1000).toLocaleString(),
                是否冷卻中: Number((partyStatus as any).cooldownEndsAt || 0) > Math.floor(Date.now() / 1000),
                未領取獎勵: formatEther((partyStatus as any).unclaimedRewards || 0n) + ' SOUL'
            } : '無法獲取',
        });

        // 測試 3: 地下城信息
        results.push({
            test: '地下城信息',
            status: dungeonInfo ? '✅' : '❌',
            value: dungeonInfo ? {
                所需戰力: (dungeonInfo as any).requiredPower?.toString(),
                獎勵: formatEther((dungeonInfo as any).rewardAmountUSD || 0n) + ' USD',
                成功率: (dungeonInfo as any).baseSuccessRate + '%',
                已初始化: (dungeonInfo as any).isInitialized ? '是' : '否'
            } : '無法獲取',
        });

        // 測試 4: 隊伍戰力
        results.push({
            test: '隊伍戰力',
            status: partyPower ? '✅' : '❌',
            value: partyPower ? {
                總戰力: (partyPower as any[])[0]?.toString(),
                總容量: (partyPower as any[])[1]?.toString(),
                戰力足夠: dungeonInfo && partyPower ? 
                    Number((partyPower as any[])[0]) >= Number((dungeonInfo as any).requiredPower) ? '是' : '否' 
                    : '未知'
            } : '無法獲取',
        });

        // 測試 5: 交易模擬
        results.push({
            test: '交易模擬',
            status: simulationResult ? '✅' : '❌',
            value: simulationError ? 
                `錯誤: ${simulationError.message}` : 
                simulationResult ? '模擬成功' : '模擬失敗',
        });

        setTestResults(results);
        logger.info('出征測試結果:', results);
    };

    const executeTransaction = () => {
        if (!dungeonMasterContract || !explorationFee) return;

        writeContract({
            address: dungeonMasterContract.address as `0x${string}`,
            abi: [{"inputs":[{"internalType":"uint256","name":"_partyId","type":"uint256"},{"internalType":"uint256","name":"_dungeonId","type":"uint256"}],"name":"requestExpedition","outputs":[],"stateMutability":"payable","type":"function"}],
            functionName: 'requestExpedition',
            args: [BigInt(testPartyId), BigInt(testDungeonId)],
            value: explorationFee,
        });
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <h3 className="text-xl font-bold text-white">🔍 出征交易測試</h3>
            
            {/* 測試參數 */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-gray-400 mb-1">隊伍 ID</label>
                    <input
                        type="number"
                        value={testPartyId}
                        onChange={(e) => setTestPartyId(e.target.value)}
                        className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-1">地下城 ID</label>
                    <input
                        type="number"
                        value={testDungeonId}
                        onChange={(e) => setTestDungeonId(e.target.value)}
                        className="w-full p-2 border rounded bg-gray-700 border-gray-600 text-white"
                    />
                </div>
            </div>

            {/* 測試按鈕 */}
            <div className="flex gap-4">
                <button
                    onClick={runTests}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                    🧪 運行檢測
                </button>
                <button
                    onClick={executeTransaction}
                    disabled={isPending || !simulationResult}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg disabled:opacity-50"
                >
                    {isPending ? '⏳ 執行中...' : '🚀 執行交易'}
                </button>
            </div>

            {/* 測試結果 */}
            {testResults.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-lg font-semibold text-white">測試結果</h4>
                    {testResults.map((result, index) => (
                        <div key={index} className="p-3 bg-gray-700 rounded border-l-4 border-blue-500">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg">{result.status}</span>
                                <span className="font-medium text-white">{result.test}</span>
                            </div>
                            <div className="text-sm text-gray-300">
                                {typeof result.value === 'object' ? (
                                    <pre className="whitespace-pre-wrap">
                                        {JSON.stringify(result.value, null, 2)}
                                    </pre>
                                ) : (
                                    result.value
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 錯誤信息 */}
            {writeError && (
                <div className="p-3 bg-red-900/20 border border-red-600 rounded">
                    <h4 className="font-semibold text-red-400">交易錯誤</h4>
                    <p className="text-sm text-red-300">{writeError.message}</p>
                </div>
            )}

            {/* 合約地址信息 */}
            <div className="text-xs text-gray-500 space-y-1">
                <p>DungeonMaster: {dungeonMasterContract?.address}</p>
                <p>DungeonStorage: {dungeonStorageContract?.address}</p>
                <p>DungeonCore: {dungeonCoreContract?.address}</p>
            </div>
        </div>
    );
};