// src/components/mint/VRFWaitingModal.tsx - VRF 等待狀態彈窗

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface VRFWaitingModalProps {
  isOpen: boolean;
  onClose: () => void;
  quantity: number;
  type: 'hero' | 'relic';
  estimatedTime?: number; // 預估時間（秒）
}

export const VRFWaitingModal: React.FC<VRFWaitingModalProps> = ({
  isOpen,
  onClose,
  quantity,
  type,
  estimatedTime = 30
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<'requesting' | 'processing' | 'finalizing'>('requesting');
  
  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0);
      setCurrentPhase('requesting');
      return;
    }
    
    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const next = prev + 1;
        
        // 更新階段
        if (next < 10) {
          setCurrentPhase('requesting');
        } else if (next < 25) {
          setCurrentPhase('processing');
        } else {
          setCurrentPhase('finalizing');
        }
        
        return next;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen]);
  
  const progress = Math.min((elapsedTime / estimatedTime) * 100, 95);
  const typeLabel = type === 'hero' ? '英雄' : '聖物';
  
  const phaseMessages = {
    requesting: '正在向 Chainlink VRF 請求隨機數...',
    processing: 'VRF 節點正在生成可驗證隨機數...',
    finalizing: '正在確定 NFT 稀有度與屬性...'
  };
  
  const phaseIcons = {
    requesting: '🎲',
    processing: '⚡',
    finalizing: '✨'
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔮 命運織造中..."
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEsc={false}
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* 動態圖標和狀態 */}
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">
            {phaseIcons[currentPhase]}
          </div>
          <h3 className="text-xl font-bold text-purple-300 mb-2">
            正在鑄造 {quantity} 個{typeLabel}
          </h3>
          <p className="text-gray-400">
            {phaseMessages[currentPhase]}
          </p>
        </div>
        
        {/* VRF 流程視覺化 */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-4">
          <div className="flex justify-between mb-3">
            <div className={`flex items-center gap-2 ${currentPhase === 'requesting' ? 'text-purple-300' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentPhase === 'requesting' ? 'bg-purple-600 animate-pulse' : 'bg-gray-700'
              }`}>
                1
              </div>
              <span className="text-sm">請求隨機</span>
            </div>
            
            <div className={`flex items-center gap-2 ${currentPhase === 'processing' ? 'text-blue-300' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentPhase === 'processing' ? 'bg-blue-600 animate-pulse' : 'bg-gray-700'
              }`}>
                2
              </div>
              <span className="text-sm">生成數值</span>
            </div>
            
            <div className={`flex items-center gap-2 ${currentPhase === 'finalizing' ? 'text-green-300' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentPhase === 'finalizing' ? 'bg-green-600 animate-pulse' : 'bg-gray-700'
              }`}>
                3
              </div>
              <span className="text-sm">確定屬性</span>
            </div>
          </div>
          
          {/* 進度條 */}
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div
              className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="mt-2 flex justify-between text-xs text-gray-400">
            <span>{elapsedTime}秒</span>
            <span>預計 {estimatedTime} 秒</span>
          </div>
        </div>
        
        {/* VRF 說明 */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-blue-300 mb-2">🎲 為什麼需要等待？</h4>
          <ul className="text-xs text-gray-400 space-y-1">
            <li>• Chainlink VRF 確保<strong className="text-blue-300">絕對公平</strong>的隨機性</li>
            <li>• 每個 NFT 的稀有度都經過<strong className="text-blue-300">鏈上驗證</strong></li>
            <li>• 無法預測或操控結果，保護所有玩家利益</li>
            <li>• 這是<strong className="text-yellow-300">真正的區塊鏈隨機性</strong>，而非偽隨機</li>
          </ul>
        </div>
        
        {/* 神秘符文動畫 */}
        <div className="flex justify-center gap-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            >
              <span className="text-purple-300">✧</span>
            </div>
          ))}
        </div>
        
        {/* 提示信息 */}
        {elapsedTime > 30 && (
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3 text-center">
            <p className="text-yellow-300 text-sm">
              ⏳ VRF 處理時間比預期長...
            </p>
            <p className="text-xs text-gray-400 mt-1">
              區塊鏈網路可能繁忙，請耐心等待
            </p>
            {elapsedTime > 60 && (
              <button
                onClick={() => {
                  onClose();
                  window.location.reload();
                }}
                className="mt-2 px-4 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs transition-colors"
              >
                手動刷新頁面
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default VRFWaitingModal;