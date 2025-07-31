import React, { useMemo } from 'react';
import { Modal } from './Modal';
import { useSoulPrice } from '../../hooks/useSoulPrice';

interface TaxRateModalProps {
    isOpen: boolean;
    onClose: () => void;
    vipTier: number;
    actualTaxRate: number;
    actualLargeTaxRate?: number;
    vipDiscount: number;
    playerLevel?: number;
    levelDiscount?: number;
    vaultBalance?: string; // 玩家的金庫餘額（SOUL）
    lastFreeWithdrawTime?: number; // 上次免稅提領時間
    freeWithdrawThresholdUsd?: number; // 免稅額度 (USD)
    largeWithdrawThresholdUsd?: number; // 大額提現額度 (USD)
}

export const TaxRateModal: React.FC<TaxRateModalProps> = ({
    isOpen,
    onClose,
    vipTier,
    actualTaxRate,
    actualLargeTaxRate,
    vipDiscount,
    playerLevel = 0,
    levelDiscount = 0,
    vaultBalance = '0',
    lastFreeWithdrawTime = 0,
    freeWithdrawThresholdUsd = 20,
    largeWithdrawThresholdUsd = 1000
}) => {
    const { priceInUsd } = useSoulPrice();
    
    // 使用 useMemo 避免重複計算和無限循環
    const withdrawalData = useMemo(() => {
        const soulPrice = priceInUsd || 0.05; // 使用預設價格避免 0
        
        console.log('TaxRateModal 計算數據:', { 
            priceInUsd, 
            soulPrice, 
            freeWithdrawThresholdUsd, 
            largeWithdrawThresholdUsd,
            actualTaxRate,
            actualLargeTaxRate,
            'soulPrice應該是': soulPrice,
            '測試計算100 SOUL': `${100 * soulPrice} USD`,
            '示例計算': {
                '19 USD': `${19 / soulPrice} SOUL`,
                '500 USD': `${500 / soulPrice} SOUL`, 
                '1500 USD': `${1500 / soulPrice} SOUL`
            }
        });
        
        // 計算不同金額的實收和稅率
        const calculateWithdrawal = (soulAmount: number) => {
            const usdValue = soulAmount * soulPrice;
            console.log(`計算 ${soulAmount} SOUL: ${usdValue} USD`);
            
            const canUseFreeWithdraw = usdValue <= freeWithdrawThresholdUsd && 
                (Date.now() - (lastFreeWithdrawTime || 0) * 1000) >= 24 * 60 * 60 * 1000;
            
            if (canUseFreeWithdraw) {
                return {
                    received: soulAmount,
                    taxRate: 0,
                    usdValue,
                    type: '免稅',
                    note: '每日一次免稅提領'
                };
            }
            
            const isLarge = usdValue >= largeWithdrawThresholdUsd;
            const taxRate = isLarge ? (actualLargeTaxRate || (actualTaxRate + 15)) : actualTaxRate;
            const received = Math.floor(soulAmount * (100 - taxRate) / 100);
            
            return {
                received,
                taxRate,
                usdValue,
                type: isLarge ? '大額' : '一般',
                note: isLarge ? `≥$${largeWithdrawThresholdUsd} USD` : `$${freeWithdrawThresholdUsd}-$${largeWithdrawThresholdUsd} USD`
            };
        };
        
        // 生成基於稅率檔位的示例金額，讓用戶理解不同檔位的差異
        const generateExampleAmounts = () => {
            // 目標 USD 價值：接近各稅率門檻的金額
            const targetUsdValues = [
                19,   // 免稅檔位 - $19 (剛好在 $20 門檻下)
                500,  // 一般檔位 - $500 (在 $20-$1000 之間)
                1500  // 大額檔位 - $1500 (超過 $1000 門檻)
            ];
            
            const examples = targetUsdValues.map(usdValue => {
                // 根據當前 SOUL 價格計算對應的 SOUL 數量
                const soulAmount = usdValue / soulPrice;
                return Math.round(soulAmount);
            });
            
            // 如果用戶有餘額，也加入用戶的實際餘額作為參考
            const userBalance = parseFloat(vaultBalance || '0');
            if (userBalance > 0) {
                examples.push(userBalance);
            }
            
            // 去重並排序
            return [...new Set(examples)]
                .filter(amount => amount > 0)
                .sort((a, b) => a - b)
                .slice(0, 4); // 最多顯示 4 個示例
        };
        
        const suggestedAmounts = generateExampleAmounts();
        
        return { calculateWithdrawal, suggestedAmounts };
    }, [priceInUsd, vaultBalance, lastFreeWithdrawTime, actualTaxRate, actualLargeTaxRate, freeWithdrawThresholdUsd, largeWithdrawThresholdUsd]);

    const { calculateWithdrawal, suggestedAmounts } = withdrawalData;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="💰 提款稅率詳情"
            onConfirm={onClose}
            confirmText="了解了"
            maxWidth="md"
            showCloseButton={false}
        >
            <div className="space-y-6">
                {/* 當前稅率展示 - 分級顯示 */}
                <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-xl p-6">
                    <p className="text-sm text-blue-300 mb-4 text-center">您當前的提款稅率</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                            <p className="text-xs text-gray-400 mb-1">一般金額 (&lt;$1000)</p>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-3xl font-bold text-white">{actualTaxRate.toFixed(1)}</span>
                                <span className="text-lg text-blue-300">%</span>
                            </div>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-gray-400 mb-1">大額金額 (≥$1000)</p>
                            <div className="flex items-baseline justify-center gap-1">
                                <span className="text-3xl font-bold text-orange-300">{(actualLargeTaxRate || (actualTaxRate + 15)).toFixed(1)}</span>
                                <span className="text-lg text-orange-300">%</span>
                            </div>
                        </div>
                    </div>
                    <div className="mt-3 space-y-2">
                        {vipTier > 0 && (
                            <div className="px-3 py-1 bg-purple-600/20 border border-purple-400/30 rounded-full inline-block mx-1">
                                <p className="text-sm text-purple-300">
                                    VIP {vipTier} 已為您節省 {vipDiscount.toFixed(1)}% 稅率 ✨
                                </p>
                            </div>
                        )}
                        {levelDiscount > 0 && (
                            <div className="px-3 py-1 bg-green-600/20 border border-green-400/30 rounded-full inline-block mx-1">
                                <p className="text-sm text-green-300">
                                    Lv.{playerLevel} 已為您節省 {levelDiscount}% 稅率 🎆
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 提款計算器 - 更新為分級稅率 */}
                <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
                        <span>📊</span>
                        <span>提款計算器</span>
                    </h4>
                    <div className="space-y-3">
                        {suggestedAmounts.map((amount, index) => {
                            const withdrawal = calculateWithdrawal(amount);
                            const userBalance = parseFloat(vaultBalance || '0');
                            const isMax = userBalance > 0 && amount === userBalance;
                            
                            return (
                                <div key={index} className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                                    <div className="text-gray-300">
                                        <div>
                                            提款 {amount.toLocaleString()} SOUL
                                            {isMax && <span className="text-yellow-400 text-xs ml-1">(全部)</span>}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            ≈ ${withdrawal.usdValue.toFixed(2)} USD · 
                                            <span className={
                                                withdrawal.type === '免稅' ? 'text-green-400' :
                                                withdrawal.type === '大額' ? 'text-orange-400' : 'text-blue-400'
                                            }>
                                                {withdrawal.type}
                                            </span>
                                        </div>
                                        {withdrawal.note && (
                                            <div className="text-xs text-gray-600">{withdrawal.note}</div>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className={`font-semibold ${
                                            withdrawal.type === '免稅' ? 'text-green-400' :
                                            withdrawal.type === '大額' ? 'text-orange-400' : 'text-blue-400'
                                        }`}>
                                            實收 {withdrawal.received.toLocaleString()}
                                        </span>
                                        <div className="text-xs text-gray-500">
                                            稅率 {withdrawal.taxRate.toFixed(1)}%
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-3 space-y-2">
                        <div className="p-3 bg-green-900/20 border border-green-600/30 rounded-lg">
                            <p className="text-xs text-green-400 flex items-center gap-1 mb-1">
                                <span>🎁</span>
                                <span>免稅提領（≤$20 USD）- 每日一次</span>
                            </p>
                            <p className="text-xs text-yellow-400 pl-4">
                                ⚠️ 重要：任何提領（包括免稅）都會重置稅率計算，每日5%降低會重新開始
                            </p>
                        </div>
                        <div className="p-2 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                            <p className="text-xs text-blue-400">一般提現（$20-$1,000 USD）- 基礎稅率 25%</p>
                        </div>
                        <div className="p-2 bg-orange-900/20 border border-orange-600/30 rounded-lg">
                            <p className="text-xs text-orange-400">大額提現（≥$1,000 USD）- 基礎稅率 40%</p>
                        </div>
                    </div>
                </div>

                {/* 降低稅率指南 */}
                <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-5">
                    <h4 className="font-semibold text-purple-300 mb-4 flex items-center gap-2">
                        <span>🎯</span>
                        <span>如何降低稅率？</span>
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 bg-purple-800/20 rounded-lg">
                            <span className="text-purple-400 text-lg">⚜️</span>
                            <div>
                                <p className="text-purple-200 font-medium">質押提升 VIP</p>
                                <p className="text-purple-300 text-sm">質押 SoulShard 提升 VIP 等級，每級可減少 0.5% 稅率</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-green-800/20 rounded-lg">
                            <span className="text-green-400 text-lg">🎯</span>
                            <div>
                                <p className="text-green-200 font-medium">提升玩家等級</p>
                                <p className="text-green-300 text-sm">挑戰地城獲得經驗值，每 10 級可減少 1% 稅率</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-blue-800/20 rounded-lg">
                            <span className="text-blue-400 text-lg">⏰</span>
                            <div>
                                <p className="text-blue-200 font-medium">每日自動降低</p>
                                <p className="text-blue-300 text-sm">系統每天自動降低 5% 稅率（無需任何操作）</p>
                                <p className="text-yellow-300 text-xs mt-1">
                                    ⚠️ 注意：任何提領後會重新開始計算，等待越久稅率越低
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-yellow-800/20 rounded-lg">
                            <span className="text-yellow-400 text-lg">👑</span>
                            <div>
                                <p className="text-yellow-200 font-medium">VIP 50 零稅率</p>
                                <p className="text-yellow-300 text-sm">達到 VIP 50 級即可享受 0% 提款稅率</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 行動建議 */}
                {vipTier < 50 && (
                    <div className="bg-gradient-to-r from-green-900/20 to-emerald-900/20 border border-green-500/30 rounded-xl p-4 text-center">
                        <p className="text-green-300 font-medium mb-2">💡 建議</p>
                        <p className="text-green-200 text-sm">
                            考慮質押 SoulShard 提升 VIP 等級，立即享受更低的提款稅率
                        </p>
                    </div>
                )}
            </div>
        </Modal>
    );
};