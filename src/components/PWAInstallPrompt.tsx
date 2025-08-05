// PWA 安裝提示元件
import React, { useState, useEffect } from 'react';
import { Icons } from './ui/icons';
import { ActionButton } from './ui/ActionButton';

interface PWAInstallPromptProps {
    className?: string;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ className = '' }) => {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // 檢測是否為 iOS 裝置
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(iOS);

        // 檢測是否已經以 PWA 模式運行
        const standalone = window.matchMedia('(display-mode: standalone)').matches;
        setIsStandalone(standalone);

        // 檢查用戶是否已經關閉過提示
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        
        // 只在 iOS Safari 且非 PWA 模式且未關閉過時顯示
        if (iOS && !standalone && !dismissed) {
            // 延遲 3 秒顯示，避免打擾初次訪問
            const timer = setTimeout(() => {
                setShowPrompt(true);
            }, 3000);
            
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    const handleNeverShow = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-install-dismissed', 'permanent');
    };

    // 如果不是 iOS 或已經是 PWA 模式，不顯示
    if (!isIOS || isStandalone || !showPrompt) {
        return null;
    }

    return (
        <div className={`fixed bottom-4 left-4 right-4 z-50 ${className}`}>
            <div className="bg-gradient-to-r from-purple-900/95 to-blue-900/95 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 shadow-2xl">
                <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-purple-600/20 rounded-full flex items-center justify-center">
                            <Icons.Smartphone className="w-5 h-5 text-purple-400" />
                        </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white mb-1">
                            📱 安裝 Soulbound Saga
                        </h3>
                        <p className="text-xs text-gray-300 mb-3">
                            將遊戲添加到主屏幕，享受更快的啟動速度和更好的遊戲體驗！
                        </p>
                        
                        {/* 安裝步驟 */}
                        <div className="space-y-1 mb-3">
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-[10px]">1</span>
                                點擊 Safari 底部的
                                <Icons.Share className="w-3 h-3" />
                                分享按鈕
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-[10px]">2</span>
                                選擇「添加到主屏幕」
                                <Icons.Plus className="w-3 h-3" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                <span className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center text-white font-bold text-[10px]">3</span>
                                點擊「添加」完成安裝
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <ActionButton
                                onClick={handleDismiss}
                                className="flex-1 text-xs py-2 bg-purple-600 hover:bg-purple-700"
                            >
                                我知道了
                            </ActionButton>
                            <button
                                onClick={handleNeverShow}
                                className="text-xs text-gray-400 hover:text-gray-300 px-2"
                            >
                                不再提示
                            </button>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleDismiss}
                        className="flex-shrink-0 text-gray-400 hover:text-white"
                    >
                        <Icons.X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// PWA 功能介紹元件（用於設置頁面）
export const PWAFeatureInfo: React.FC<{ className?: string }> = ({ className = '' }) => {
    const [isStandalone, setIsStandalone] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
        setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    }, []);

    return (
        <div className={`bg-gray-800/50 rounded-xl p-4 border border-gray-700 ${className}`}>
            <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-purple-600/20 rounded-full flex items-center justify-center">
                    <Icons.Smartphone className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-white">手機 APP 體驗</h3>
                    <p className="text-xs text-gray-400">
                        {isStandalone ? '✅ 已安裝為 PWA' : '📱 可安裝為手機應用'}
                    </p>
                </div>
            </div>

            {isStandalone ? (
                <div className="space-y-2">
                    <p className="text-xs text-green-400">
                        🎉 您已成功將 Soulbound Saga 安裝為手機應用！
                    </p>
                    <div className="space-y-1 text-xs text-gray-300">
                        <p>✨ 享受的功能：</p>
                        <ul className="list-disc list-inside ml-4 space-y-1 text-gray-400">
                            <li>更快的啟動速度</li>
                            <li>全屏遊戲體驗</li>
                            <li>離線緩存支援</li>
                            <li>類原生 APP 操作</li>
                        </ul>
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-gray-300">
                        將 Soulbound Saga 添加到主屏幕，享受類似原生 APP 的體驗！
                    </p>
                    
                    {isIOS ? (
                        <div className="space-y-1 text-xs text-gray-400">
                            <p className="font-medium text-gray-300">📱 iPhone/iPad 安裝步驟：</p>
                            <ol className="list-decimal list-inside ml-4 space-y-1">
                                <li>點擊 Safari 底部的分享按鈕 <Icons.Share className="inline w-3 h-3" /></li>
                                <li>選擇「添加到主屏幕」<Icons.Plus className="inline w-3 h-3 ml-1" /></li>
                                <li>點擊「添加」完成安裝</li>
                            </ol>
                        </div>
                    ) : (
                        <div className="space-y-1 text-xs text-gray-400">
                            <p className="font-medium text-gray-300">🤖 Android 安裝步驟：</p>
                            <ol className="list-decimal list-inside ml-4 space-y-1">
                                <li>點擊瀏覽器選單（三個點）</li>
                                <li>選擇「添加到主屏幕」或「安裝應用」</li>
                                <li>確認安裝</li>
                            </ol>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};