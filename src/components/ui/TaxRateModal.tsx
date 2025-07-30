import React from 'react';
import { Modal } from './Modal';

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
    // 計算不同金額的實收
    const calculateReceived = (amount: number) => {
        return Math.floor(amount * (100 - actualTaxRate) / 100);
    };

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
                {/* 當前稅率展示 */}
                <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/30 rounded-xl p-6 text-center">
                    <p className="text-sm text-blue-300 mb-2">您當前的提款稅率</p>
                    <div className="flex items-baseline justify-center gap-2">
                        <span className="text-5xl font-bold text-white">{actualTaxRate.toFixed(1)}</span>
                        <span className="text-xl text-blue-300">%</span>
                    </div>
                    {vipTier > 0 && (
                        <div className="mt-3 px-3 py-1 bg-purple-600/20 border border-purple-400/30 rounded-full inline-block">
                            <p className="text-sm text-purple-300">
                                VIP {vipTier} 已為您節省 {vipDiscount.toFixed(1)}% 稅率 ✨
                            </p>
                        </div>
                    )}
                </div>

                {/* 提款計算器 */}
                <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
                        <span>📊</span>
                        <span>提款計算器</span>
                    </h4>
                    <div className="space-y-3">
                        {[100, 1000, 10000].map((amount, index) => (
                            <div key={amount} className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                                <span className="text-gray-300">
                                    提款 {amount.toLocaleString()} SOUL
                                </span>
                                <div className="text-right">
                                    <span className="text-green-400 font-semibold">
                                        實收 {calculateReceived(amount).toLocaleString()}
                                    </span>
                                    {index === 2 && (
                                        <span className="text-yellow-400 text-xs ml-1">*</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-yellow-400 mt-3 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>* 大額提現（≥10,000 SOUL）需額外加收 5% 手續費</span>
                    </p>
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
                        <div className="flex items-start gap-3 p-3 bg-blue-800/20 rounded-lg">
                            <span className="text-blue-400 text-lg">⏰</span>
                            <div>
                                <p className="text-blue-200 font-medium">每日自動降低</p>
                                <p className="text-blue-300 text-sm">系統每天自動降低 0.1% 稅率（無需任何操作）</p>
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