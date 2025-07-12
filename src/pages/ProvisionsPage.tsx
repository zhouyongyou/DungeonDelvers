// src/pages/ProvisionsPage.tsx - 簡化版本

import React, { useState } from 'react';
import { useAccount, useNetwork } from 'wagmi';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { bsc } from 'wagmi/chains';

const ProvisionsPage: React.FC = () => {
    const { address } = useAccount();
    const { chain } = useNetwork();
    const [quantity, setQuantity] = useState<number>(1);

    if (!address) {
        return <EmptyState message="請先連接錢包" />;
    }

    if (!chain || chain.id !== bsc.id) {
        return <div className="p-4 text-center text-gray-400">請連接到 BSC 網路</div>;
    }

    return (
        <div className="p-4 space-y-4">
            <div className="p-4 bg-gray-800/50 rounded-lg space-y-2 text-sm">
                <h3 className="font-bold text-yellow-400">儲備購買功能</h3>
                <p className="text-gray-300">
                    儲備購買功能正在重構中，請稍後再試。
                </p>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">購買數量</label>
                <input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} 
                    min="1"
                    className="w-full p-2 border rounded-lg bg-gray-800 border-gray-600 text-white" 
                />
            </div>

            <div className="text-center p-4 bg-black/20 rounded-lg">
                <div className="text-sm text-gray-400">功能重構中</div>
                <div className="font-mono text-lg text-white">
                    <LoadingSpinner size="h-6 w-6" />
                </div>
            </div>

            <button 
                disabled
                className="w-full h-12 bg-gray-600 text-gray-400 rounded-lg cursor-not-allowed"
            >
                功能重構中...
            </button>
        </div>
    );
};

export default ProvisionsPage;
