// Price Debug Page - 用於診斷價格計算問題
import React, { useEffect } from 'react';
import { useReadContract, useReadContracts } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { bsc } from 'wagmi/chains';
import { getContractLegacy } from '../config/contractsWithABI';

// Oracle 狀態檢查組件
const OracleStatusCheck: React.FC<{ oracleAddress: `0x${string}` | undefined }> = ({ oracleAddress }) => {
    const oracleContract = getContractLegacy(bsc.id, 'oracle');
    
    // 讀取 Oracle 基本資訊
    const { data: oracleData, error: oracleError } = useReadContracts({
        contracts: [
            {
                address: oracleAddress,
                abi: oracleContract?.abi,
                functionName: 'owner'
            },
            {
                address: oracleAddress,
                abi: oracleContract?.abi,
                functionName: 'paused'
            }
        ],
        query: {
            enabled: !!oracleAddress && !!oracleContract
        }
    });
    
    if (!oracleAddress) {
        return <p className="text-yellow-400">Oracle 地址未設置</p>;
    }
    
    if (oracleError) {
        return <p className="text-red-400">無法讀取 Oracle: {oracleError.message}</p>;
    }
    
    return (
        <div className="space-y-2">
            <p>Oracle 地址: {oracleAddress}</p>
            <p>Owner: {oracleData?.[0]?.result || 'Loading...'}</p>
            <p>Paused: {oracleData?.[1]?.result?.toString() || 'Loading...'}</p>
        </div>
    );
};

const PriceDebugPage: React.FC = () => {
    const chainId = bsc.id;
    
    // 獲取合約
    const heroContract = getContractLegacy(chainId, 'hero');
    const dungeonCoreContract = getContractLegacy(chainId, 'dungeonCore');
    const oracleContract = getContractLegacy(chainId, 'oracle');
    
    // 1. 讀取 Hero 的 mintPriceUSD
    const { data: mintPriceUSD, error: mintPriceError } = useReadContract({
        address: heroContract?.address,
        abi: heroContract?.abi,
        functionName: 'mintPriceUSD'
    });
    
    // 2. 讀取 DungeonCore 的 Oracle 地址和 USD decimals
    const { data: coreData } = useReadContracts({
        contracts: [
            {
                address: dungeonCoreContract?.address,
                abi: dungeonCoreContract?.abi,
                functionName: 'oracleAddress'
            },
            {
                address: dungeonCoreContract?.address,
                abi: dungeonCoreContract?.abi,
                functionName: 'usdDecimals'
            },
            {
                address: dungeonCoreContract?.address,
                abi: dungeonCoreContract?.abi,
                functionName: 'usdTokenAddress'
            }
        ]
    });
    
    const oracleAddress = coreData?.[0]?.result;
    const usdDecimals = coreData?.[1]?.result;
    const usdTokenAddress = coreData?.[2]?.result;
    
    // 3. 測試不同數量的價格計算
    const quantities = [1, 5, 10];
    const { data: priceData, error: priceError } = useReadContracts({
        contracts: quantities.map(q => ({
            address: heroContract?.address,
            abi: heroContract?.abi,
            functionName: 'getRequiredSoulShardAmount',
            args: [BigInt(q)]
        }))
    });
    
    // 4. 測試 DungeonCore 的 getSoulShardAmountForUSD
    const testAmounts = [parseEther('1'), parseEther('2'), parseEther('10')];
    const { data: coreConversionData } = useReadContracts({
        contracts: testAmounts.map(amount => ({
            address: dungeonCoreContract?.address,
            abi: dungeonCoreContract?.abi,
            functionName: 'getSoulShardAmountForUSD',
            args: [amount]
        }))
    });
    
    // 5. 直接測試 Oracle 的 getAmountOut
    const { data: oracleDirectData } = useReadContracts({
        contracts: testAmounts.map(amount => ({
            address: oracleAddress,
            abi: oracleContract?.abi,
            functionName: 'getAmountOut',
            args: [usdTokenAddress, amount]
        })),
        query: {
            enabled: !!oracleAddress && !!usdTokenAddress
        }
    });
    
    // 調試輸出
    useEffect(() => {
        console.log('[PriceDebugPage] 完整診斷:', {
            errors: {
                mintPriceError,
                priceError,
            },
            contracts: {
                hero: heroContract?.address,
                dungeonCore: dungeonCoreContract?.address,
                oracle: oracleAddress
            },
            mintPriceUSD: {
                raw: mintPriceUSD?.toString(),
                formatted: mintPriceUSD ? formatEther(mintPriceUSD) : 'N/A',
                hex: mintPriceUSD ? '0x' + mintPriceUSD.toString(16) : 'N/A'
            },
            coreSettings: {
                oracleAddress,
                usdDecimals: usdDecimals?.toString(),
                usdTokenAddress
            },
            priceCalculations: quantities.map((q, i) => ({
                quantity: q,
                result: priceData?.[i]?.result?.toString(),
                formatted: priceData?.[i]?.result ? formatEther(priceData[i].result as bigint) : 'N/A',
                perUnit: priceData?.[i]?.result ? 
                    Number(formatEther(priceData[i].result as bigint)) / q : 'N/A'
            })),
            coreConversions: testAmounts.map((amount, i) => ({
                inputUSD: formatEther(amount),
                outputSoul: coreConversionData?.[i]?.result?.toString(),
                formatted: coreConversionData?.[i]?.result ? 
                    formatEther(coreConversionData[i].result as bigint) : 'N/A'
            })),
            oracleDirect: testAmounts.map((amount, i) => ({
                inputUSD: formatEther(amount),
                outputSoul: oracleDirectData?.[i]?.result?.toString(),
                formatted: oracleDirectData?.[i]?.result ? 
                    formatEther(oracleDirectData[i].result as bigint) : 'N/A'
            }))
        });
    }, [mintPriceUSD, coreData, priceData, coreConversionData, oracleDirectData]);
    
    return (
        <section className="max-w-6xl mx-auto p-6">
            <h2 className="text-3xl font-bold mb-6">價格計算診斷</h2>
            
            {/* 合約地址 */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">合約地址</h3>
                <div className="space-y-2 font-mono text-sm">
                    <p>Hero: {heroContract?.address}</p>
                    <p>DungeonCore: {dungeonCoreContract?.address}</p>
                    <p>Oracle: {oracleAddress || 'Loading...'}</p>
                </div>
            </div>
            
            {/* mintPriceUSD */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Hero mintPriceUSD</h3>
                <div className="space-y-2">
                    <p>Raw: {mintPriceUSD?.toString()}</p>
                    <p>Formatted: {mintPriceUSD ? formatEther(mintPriceUSD) : 'N/A'} USD</p>
                    <p className="text-sm text-gray-400">預期: 2 USD</p>
                    {mintPriceError && (
                        <p className="text-red-400">錯誤: {mintPriceError.message}</p>
                    )}
                </div>
            </div>
            
            {/* DungeonCore 設置 */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">DungeonCore 設置</h3>
                <div className="space-y-2">
                    <p>USD Decimals: {usdDecimals?.toString()}</p>
                    <p>USD Token: {usdTokenAddress}</p>
                    <p className="text-sm text-gray-400">BUSD 應該是 18 decimals</p>
                </div>
            </div>
            
            {/* 價格計算測試 */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Hero.getRequiredSoulShardAmount 測試</h3>
                <div className="space-y-4">
                    {quantities.map((q, i) => (
                        <div key={q} className="border-b border-gray-700 pb-2">
                            <p className="font-semibold">數量: {q}</p>
                            <p>結果: {priceData?.[i]?.result?.toString()}</p>
                            <p>格式化: {priceData?.[i]?.result ? 
                                formatEther(priceData[i].result as bigint) : 'N/A'} SOUL</p>
                            <p>單價: {priceData?.[i]?.result ? 
                                (Number(formatEther(priceData[i].result as bigint)) / q).toFixed(2) : 'N/A'} SOUL</p>
                            <p className={`text-sm ${
                                priceData?.[i]?.result && 
                                Number(formatEther(priceData[i].result as bigint)) / q > 100000 
                                    ? 'text-red-400' : 'text-green-400'
                            }`}>
                                {priceData?.[i]?.result && 
                                Number(formatEther(priceData[i].result as bigint)) / q > 100000 
                                    ? '⚠️ 價格異常！' : '✓ 價格正常'}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* DungeonCore 轉換測試 */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">DungeonCore.getSoulShardAmountForUSD 測試</h3>
                <div className="space-y-4">
                    {testAmounts.map((amount, i) => (
                        <div key={i} className="border-b border-gray-700 pb-2">
                            <p className="font-semibold">{formatEther(amount)} USD</p>
                            <p>結果: {coreConversionData?.[i]?.result?.toString()}</p>
                            <p>格式化: {coreConversionData?.[i]?.result ? 
                                formatEther(coreConversionData[i].result as bigint) : 'N/A'} SOUL</p>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* Oracle 直接測試 */}
            <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold mb-4">Oracle.getAmountOut 直接測試</h3>
                <div className="space-y-4">
                    {testAmounts.map((amount, i) => (
                        <div key={i} className="border-b border-gray-700 pb-2">
                            <p className="font-semibold">{formatEther(amount)} USD</p>
                            <p>結果: {oracleDirectData?.[i]?.result?.toString()}</p>
                            <p>格式化: {oracleDirectData?.[i]?.result ? 
                                formatEther(oracleDirectData[i].result as bigint) : 'N/A'} SOUL</p>
                        </div>
                    ))}
                </div>
            </div>
            
            {/* 新增：直接讀取 Oracle 狀態 */}
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4">Oracle 直接狀態檢查</h3>
                <OracleStatusCheck oracleAddress={oracleAddress as `0x${string}`} />
            </div>
            
            <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                <p className="text-yellow-400">
                    💡 請打開瀏覽器控制台查看詳細的診斷信息
                </p>
            </div>
        </section>
    );
};

export default PriceDebugPage;