// src/components/settings/DisplayModeToggle.tsx - NFT 顯示模式切換

import React from 'react';
import { useNftDisplayMode } from '../../hooks/useNftDisplayMode';

export const DisplayModeToggle: React.FC = () => {
    const { displayMode, setDisplayMode } = useNftDisplayMode();
    
    const modes = [
        { value: 'auto', label: '自動', description: '根據設備性能自動選擇' },
        { value: 'svg', label: 'SVG', description: '向量圖形，縮放不失真' },
        { value: 'png', label: 'PNG', description: '傳統圖片，載入快速' }
    ] as const;
    
    return (
        <div className="bg-gray-800 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2">NFT 顯示模式</h3>
            <p className="text-sm text-gray-400 mb-4">
                選擇您喜歡的 NFT 顯示方式
            </p>
            
            <div className="space-y-2">
                {modes.map((mode) => (
                    <label 
                        key={mode.value}
                        className={`
                            flex items-center p-3 rounded-lg cursor-pointer transition-all
                            ${displayMode === mode.value 
                                ? 'bg-indigo-600/20 border-indigo-500' 
                                : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                            }
                            border
                        `}
                    >
                        <input
                            type="radio"
                            name="displayMode"
                            value={mode.value}
                            checked={displayMode === mode.value}
                            onChange={(e) => setDisplayMode(e.target.value as any)}
                            className="mr-3"
                        />
                        <div className="flex-1">
                            <div className="font-medium">{mode.label}</div>
                            <div className="text-sm text-gray-400">{mode.description}</div>
                        </div>
                        {mode.value === 'svg' && (
                            <div className="ml-2 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                                實驗性
                            </div>
                        )}
                    </label>
                ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-300">
                    💡 <strong>提示</strong>：SVG 模式提供最佳視覺品質，但可能在某些設備上較慢。
                    自動模式會根據您的設備性能智能選擇。
                </p>
            </div>
        </div>
    );
};