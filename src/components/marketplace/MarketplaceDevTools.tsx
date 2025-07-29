// src/components/marketplace/MarketplaceDevTools.tsx
// Development tools for marketplace mode switching

import React, { useState } from 'react';
import { Icons } from '../ui/icons';
import { ActionButton } from '../ui/ActionButton';
import { MARKETPLACE_CONFIG, setMarketplaceMode, getMarketplaceMode } from '../../config/marketplaceConfig';
import { useMarketplaceMode } from '../../hooks/useMarketplaceUnified';

interface MarketplaceDevToolsProps {
    className?: string;
}

export const MarketplaceDevTools: React.FC<MarketplaceDevToolsProps> = ({ 
    className = '' 
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { useApi, isLocal } = useMarketplaceMode();
    
    if (!MARKETPLACE_CONFIG.enableDevTools) {
        return null;
    }
    
    const handleModeSwitch = (newMode: boolean) => {
        setMarketplaceMode(newMode);
        // Force page reload to apply the change
        window.location.reload();
    };
    
    return (
        <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
            <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg">
                {/* Toggle Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                    <Icons.Package className="h-4 w-4" />
                    <span>開發工具</span>
                    {isExpanded ? (
                        <Icons.ChevronUp className="h-4 w-4" />
                    ) : (
                        <Icons.ChevronDown className="h-4 w-4" />
                    )}
                </button>
                
                {/* Expanded Panel */}
                {isExpanded && (
                    <div className="border-t border-gray-700 p-4 min-w-[300px]">
                        <h3 className="text-sm font-semibold text-white mb-3">市場模式設定</h3>
                        
                        {/* Current Mode Display */}
                        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">當前模式:</span>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${
                                        useApi ? 'bg-green-400' : 'bg-blue-400'
                                    }`} />
                                    <span className="text-sm font-medium text-white">
                                        {useApi ? 'API 模式' : 'localStorage 模式'}
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                                {useApi ? (
                                    '使用 Vercel API 進行數據存儲和同步'
                                ) : (
                                    '使用瀏覽器本地存儲，僅限單一設備'
                                )}
                            </div>
                        </div>
                        
                        {/* Mode Switch Buttons */}
                        <div className="space-y-2">
                            <ActionButton
                                onClick={() => handleModeSwitch(false)}
                                disabled={isLocal}
                                className={`w-full py-2 text-sm ${
                                    isLocal 
                                        ? 'bg-blue-700 text-white' 
                                        : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                <Icons.Package className="h-4 w-4 mr-2" />
                                切換到 localStorage 模式
                            </ActionButton>
                            
                            <ActionButton
                                onClick={() => handleModeSwitch(true)}
                                disabled={useApi}
                                className={`w-full py-2 text-sm ${
                                    useApi 
                                        ? 'bg-green-700 text-white' 
                                        : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                            >
                                <Icons.TrendingUp className="h-4 w-4 mr-2" />
                                切換到 API 模式
                            </ActionButton>
                        </div>
                        
                        {/* Mode Comparison */}
                        <div className="mt-4 text-xs text-gray-400 space-y-1">
                            <div className="font-medium text-gray-300">模式比較:</div>
                            <div>• localStorage: 快速測試，無需後端</div>
                            <div>• API: 生產就緒，支援跨設備同步</div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="mt-4 pt-3 border-t border-gray-700">
                            <div className="text-xs font-medium text-gray-300 mb-2">快速操作:</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (isLocal) {
                                            localStorage.removeItem('marketplace_listings');
                                            window.dispatchEvent(new Event('marketplaceUpdate'));
                                        } else {
                                            console.log('API 模式下無法清除本地數據');
                                        }
                                    }}
                                    className="text-xs px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded transition-colors"
                                    disabled={useApi}
                                >
                                    清除本地數據
                                </button>
                                <button
                                    onClick={() => {
                                        console.log('Marketplace Config:', MARKETPLACE_CONFIG);
                                        console.log('Current Mode:', { useApi, isLocal });
                                    }}
                                    className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                                >
                                    顯示配置
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};