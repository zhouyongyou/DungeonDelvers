// src/components/vip/VipLevelConverter.tsx
// VIP 等級轉換器組件

import React, { useState, useMemo } from 'react';
import { useSoulPrice } from '../../hooks/useSoulPrice';

export const VipLevelConverter: React.FC = () => {
    const [inputValue, setInputValue] = useState('');
    const [inputMode, setInputMode] = useState<'usd' | 'level' | 'soul'>('usd');
    const { priceInUsd, isLoading: isPriceLoading } = useSoulPrice();
    
    const calculations = useMemo(() => {
        if (!inputValue || isNaN(Number(inputValue))) return null;
        
        const value = parseFloat(inputValue);
        if (value <= 0) return null;
        
        let usdValue: number;
        let vipLevel: number;
        let soulAmount: number;
        
        switch (inputMode) {
            case 'usd':
                usdValue = value;
                vipLevel = Math.floor(Math.sqrt(usdValue / 100));
                soulAmount = priceInUsd > 0 ? usdValue / priceInUsd : 0;
                break;
            case 'level':
                vipLevel = Math.floor(value);
                usdValue = Math.pow(vipLevel, 2) * 100;
                soulAmount = priceInUsd > 0 ? usdValue / priceInUsd : 0;
                break;
            case 'soul':
                soulAmount = value;
                usdValue = priceInUsd > 0 ? soulAmount * priceInUsd : 0;
                vipLevel = Math.floor(Math.sqrt(usdValue / 100));
                break;
            default:
                return null;
        }
        
        // 計算稅率減免
        const taxReduction = Math.min(vipLevel * 0.5, 10); // 最高10%
        const baseTaxRate = 25; // 基礎25%
        const finalTaxRate = Math.max(0, baseTaxRate - taxReduction);
        
        // 計算下一等級需要的金額
        const nextLevel = vipLevel + 1;
        const nextLevelUsd = Math.pow(nextLevel, 2) * 100;
        const nextLevelSoul = priceInUsd > 0 ? nextLevelUsd / priceInUsd : 0;
        const additionalUsdNeeded = Math.max(0, nextLevelUsd - usdValue);
        const additionalSoulNeeded = priceInUsd > 0 ? additionalUsdNeeded / priceInUsd : 0;
        
        return {
            usdValue,
            vipLevel,
            soulAmount,
            taxReduction,
            finalTaxRate,
            nextLevel,
            nextLevelUsd,
            nextLevelSoul,
            additionalUsdNeeded,
            additionalSoulNeeded
        };
    }, [inputValue, inputMode, priceInUsd]);
    
    const quickButtons = [
        { label: 'VIP 1 ($100)', value: '1', mode: 'level' as const },
        { label: 'VIP 3 ($900)', value: '3', mode: 'level' as const },
        { label: 'VIP 5 ($2,500)', value: '5', mode: 'level' as const },
        { label: 'VIP 10 ($10,000)', value: '10', mode: 'level' as const },
        { label: 'VIP 20 ($40,000)', value: '20', mode: 'level' as const }
    ];
    
    return (
        <div className="space-y-4">
            {/* 輸入區域 */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">
                        輸入數值
                    </label>
                    <div className="flex bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setInputMode('usd')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                inputMode === 'usd'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            USD
                        </button>
                        <button
                            onClick={() => setInputMode('level')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                inputMode === 'level'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            等級
                        </button>
                        <button
                            onClick={() => setInputMode('soul')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${
                                inputMode === 'soul'
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            SOUL
                        </button>
                    </div>
                </div>
                
                <div className="relative">
                    <input
                        type="number"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={
                            inputMode === 'usd' ? '輸入 USD 金額' :
                            inputMode === 'level' ? '輸入 VIP 等級' :
                            '輸入 SOUL 數量'
                        }
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent pr-12"
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                        {inputMode === 'usd' ? '$' : inputMode === 'level' ? 'LV' : 'SOUL'}
                    </div>
                </div>
            </div>
            
            {/* 快速選擇按鈕 */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {quickButtons.map((button, index) => (
                    <button
                        key={index}
                        onClick={() => {
                            setInputMode(button.mode);
                            setInputValue(button.value);
                        }}
                        className="py-1.5 px-2 bg-gray-700/50 hover:bg-gray-600/50 rounded text-xs transition-colors"
                    >
                        {button.label}
                    </button>
                ))}
            </div>
            
            {/* 計算結果 */}
            {calculations && (
                <div className="space-y-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
                    <h5 className="text-sm font-medium text-indigo-300">轉換結果</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="text-center p-2 bg-gray-700/30 rounded">
                            <div className="text-gray-400">USD 價值</div>
                            <div className="font-bold text-yellow-400">
                                ${calculations.usdValue.toLocaleString()}
                            </div>
                        </div>
                        <div className="text-center p-2 bg-gray-700/30 rounded">
                            <div className="text-gray-400">VIP 等級</div>
                            <div className="font-bold text-purple-400">
                                LV {calculations.vipLevel}
                            </div>
                        </div>
                        <div className="text-center p-2 bg-gray-700/30 rounded">
                            <div className="text-gray-400">SOUL 數量</div>
                            <div className="font-bold text-blue-400">
                                {isPriceLoading ? '計算中...' : calculations.soulAmount.toFixed(2)}
                            </div>
                        </div>
                    </div>
                    
                    {/* 稅率信息 */}
                    <div className="flex justify-between items-center py-2 px-3 bg-green-900/20 border border-green-500/30 rounded">
                        <span className="text-sm text-gray-300">提現稅率</span>
                        <div className="text-right">
                            <div className="text-sm font-bold text-green-400">
                                {calculations.finalTaxRate.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-400">
                                減免 -{calculations.taxReduction.toFixed(1)}%
                            </div>
                        </div>
                    </div>
                    
                    {/* 升級信息 */}
                    {calculations.vipLevel < 20 && calculations.additionalUsdNeeded > 0 && (
                        <div className="p-2 bg-blue-900/20 border border-blue-500/30 rounded">
                            <div className="text-xs text-blue-300 mb-1">
                                升級至 VIP {calculations.nextLevel} 需要：
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">額外投入：</span>
                                <div className="text-right">
                                    <div className="text-yellow-400">
                                        +${calculations.additionalUsdNeeded.toLocaleString()}
                                    </div>
                                    {!isPriceLoading && (
                                        <div className="text-blue-400">
                                            +{calculations.additionalSoulNeeded.toFixed(2)} SOUL
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {calculations.vipLevel >= 20 && (
                        <div className="text-center p-2 bg-yellow-900/20 border border-yellow-500/30 rounded">
                            <div className="text-yellow-300 font-medium text-xs">
                                🎉 已達到最高 VIP 等級！
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VipLevelConverter;