import React from 'react';
import { X } from 'lucide-react';

interface TaxRateModalProps {
    isOpen: boolean;
    onClose: () => void;
    vipTier: number;
    actualTaxRate: number;
    vipDiscount: number;
}

export const TaxRateModal: React.FC<TaxRateModalProps> = ({
    isOpen,
    onClose,
    vipTier,
    actualTaxRate,
    vipDiscount
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 relative animate-fadeIn">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>

                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-3xl">💰</span>
                    提款稅率說明
                </h2>

                <div className="space-y-4">
                    {/* 當前稅率 */}
                    <div className="bg-gray-700/50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-[#C0A573] mb-2">當前稅率</h3>
                        <p className="text-3xl font-bold text-white">{actualTaxRate.toFixed(1)}%</p>
                    </div>

                    {/* 稅率組成 */}
                    <div className="bg-gray-700/50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-[#C0A573] mb-3">稅率計算</h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-gray-300">
                                <span>基礎稅率</span>
                                <span className="text-white font-medium">25.0%</span>
                            </div>
                            {vipTier > 0 && (
                                <div className="flex justify-between text-green-400">
                                    <span>VIP {vipTier} 減免</span>
                                    <span className="font-medium">-{vipDiscount.toFixed(1)}%</span>
                                </div>
                            )}
                            <div className="border-t border-gray-600 pt-2 flex justify-between text-white font-bold">
                                <span>實際稅率</span>
                                <span className="text-[#C0A573]">{actualTaxRate.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* VIP 等級說明 */}
                    <div className="bg-gray-700/50 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-[#C0A573] mb-3">VIP 稅率減免</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-300">
                                <span>VIP 1</span>
                                <span>稅率 24.5% (減免 0.5%)</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                                <span>VIP 2</span>
                                <span>稅率 24.0% (減免 1.0%)</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                                <span>VIP 5</span>
                                <span>稅率 22.5% (減免 2.5%)</span>
                            </div>
                            <div className="flex justify-between text-gray-300">
                                <span>VIP 10</span>
                                <span>稅率 20.0% (減免 5.0%)</span>
                            </div>
                        </div>
                    </div>

                    {/* 公式說明 */}
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
                        <p className="text-sm text-blue-300">
                            <span className="font-semibold">📚 計算公式：</span><br />
                            實際稅率 = 25% - (VIP 等級 × 0.5%)
                        </p>
                    </div>

                    {/* 行動呼籲 */}
                    {vipTier === 0 && (
                        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-700/30 rounded-lg p-4 text-center">
                            <p className="text-purple-300 font-medium">
                                💎 質押 SoulShard 成為 VIP，享受稅率減免！
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};