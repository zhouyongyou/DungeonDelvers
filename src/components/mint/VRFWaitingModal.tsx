// src/components/mint/VRFWaitingModal.tsx - VRF 等待狀態彈窗

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface VRFWaitingModalProps {
  isOpen: boolean;
  onClose: () => void;
  quantity?: number;
  type: 'hero' | 'relic' | 'altar' | 'dungeon';
  estimatedTime?: number; // 預估時間（秒）
  partyId?: bigint | number; // 遠征使用
}

export const VRFWaitingModal: React.FC<VRFWaitingModalProps> = ({
  isOpen,
  onClose,
  quantity,
  type,
  estimatedTime = 30,
  partyId
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPhase, setCurrentPhase] = useState<'requesting' | 'processing' | 'finalizing' | 'completed'>('requesting');
  const [isCompleted, setIsCompleted] = useState(false);
  
  useEffect(() => {
    if (!isOpen || isCompleted) return;
    
    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const next = prev + 1;
        
        // 更新階段（如果尚未完成）
        if (!isCompleted) {
          if (next < 10) {
            setCurrentPhase('requesting');
          } else if (next < 25) {
            setCurrentPhase('processing');
          } else if (next < 35) {
            setCurrentPhase('finalizing');
          }
        }
        
        return next;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isOpen, isCompleted]);
  
  const progress = isCompleted ? 100 : Math.min((elapsedTime / estimatedTime) * 100, 95);
  const getTypeLabel = () => {
    switch (type) {
      case 'hero': return '英雄';
      case 'relic': return '聖物';
      case 'altar': return '升星';
      case 'dungeon': return '遠征';
      default: return 'NFT';
    }
  };
  const typeLabel = getTypeLabel();
  
  const getPhaseMessages = () => {
    switch (type) {
      case 'hero':
      case 'relic':
        return {
          requesting: '正在向 Chainlink VRF 請求隨機數...',
          processing: 'VRF 節點正在生成可驗證隨機數...',
          finalizing: '正在確定 NFT 稀有度與屬性...',
          completed: '鑄造完成！NFT 屬性已確定'
        };
      case 'altar':
        return {
          requesting: '正在向 Chainlink VRF 請求隨機數...',
          processing: 'VRF 節點正在生成可驗證隨機數...',
          finalizing: '神諷正在決定升星結果...',
          completed: '升星儀式完成！結果已確定'
        };
      case 'dungeon':
        return {
          requesting: '正在向 Chainlink VRF 請求隨機數...',
          processing: 'VRF 節點正在生成可驗證隨機數...',
          finalizing: '命運之輪正在決定遠征結果...',
          completed: '遠征完成！戰利成果已確定'
        };
      default:
        return {
          requesting: '正在請求隨機數...',
          processing: '正在處理...',
          finalizing: '正在確定結果...',
          completed: '完成！'
        };
    }
  };
  const phaseMessages = getPhaseMessages();
  
  const phaseIcons = {
    requesting: '🎲',
    processing: '⚡',
    finalizing: '✨',
    completed: '🎉'
  };
  
  // 接收外部完成通知
  useEffect(() => {
    if (isOpen && (window as any).vrfCompleted) {
      setCurrentPhase('completed');
      setIsCompleted(true);
      // 不立即清除，等 Modal 關閉後再清除
    }
  }, [isOpen]);
  
  // 當 Modal 關閉時重置狀態
  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0);
      setCurrentPhase('requesting');
      setIsCompleted(false);
      // 清除全局狀態
      (window as any).vrfCompleted = false;
    }
  }, [isOpen]);
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🔮 命運織造中..."
      showCloseButton={isCompleted}
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
            {type === 'altar' ? `正在進行 ${typeLabel} 儀式` : 
             type === 'dungeon' ? `隊伍 #${partyId || '?'} ${typeLabel}中` :
             `正在鑄造 ${quantity || 0} 個${typeLabel}`}
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
              <span className="text-sm">{type === 'altar' ? '確定結果' : type === 'dungeon' ? '確定戰利' : '確定屬性'}</span>
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