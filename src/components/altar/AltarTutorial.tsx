// AltarTutorial.tsx - 祭壇使用教學組件
import React, { useState } from 'react';
import { Modal } from '../ui/Modal';

interface AltarTutorialProps {
  isOpen: boolean;
  onClose: () => void;
}

const tutorialSteps = [
  {
    title: "歡迎來到升星祭壇",
    content: (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-lg text-gray-300 leading-relaxed mb-4">
            這裡是古老的升星祭壇，您可以將多個同星級的 NFT 作為祭品，
            通過神秘儀式合成更高星級的強大資產。
          </p>
        </div>
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
          <p className="text-sm text-purple-200">
            <strong>重要提醒：</strong>升星結果完全由鏈上隨機數決定，
            確保絕對公平且無法人為操控。
          </p>
        </div>
      </div>
    )
  },
  {
    title: "選擇升級目標",
    content: (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-blue-300 mb-1">1. 選擇 NFT 類型</h4>
            <p className="text-sm text-blue-200">
              選擇要升星的 NFT 類型：<strong>英雄</strong> 或 <strong>聖物</strong>
            </p>
          </div>
          <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-indigo-300 mb-1">2. 選擇當前星級</h4>
            <p className="text-sm text-indigo-200">
              選擇要升星的 NFT 當前星級 (1★ → 2★, 2★ → 3★, 等等)
            </p>
          </div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-2 mt-3">
          <p className="text-xs text-yellow-200">
            <strong>小提示：</strong>不同星級需要的祭品數量和成功率都不同哦！
          </p>
        </div>
      </div>
    )
  },
  {
    title: "理解升星規則",
    content: (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-2">
            <strong className="text-purple-300">神跡降臨 (大成功)</strong>
            <p className="text-sm text-purple-200">獲得 <strong>2 個</strong>更高星級的 NFT</p>
          </div>
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-2">
            <strong className="text-green-300">祝福成功 (普通成功)</strong>
            <p className="text-sm text-green-200">獲得 <strong>1 個</strong>更高星級的 NFT</p>
          </div>
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2">
            <strong className="text-red-300">祭品消散 (失敗)</strong>
            <p className="text-sm text-red-200">失去所有祭品材料</p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "選擇祭品材料",
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-blue-300 mb-1">材料選擇策略</h4>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• 點擊 NFT 卡片來選擇/取消選擇</li>
              <li>• 建議優先選擇戰力/容量較低的作為祭品</li>
              <li>• 選滿所需數量後會自動彈出確認窗口</li>
            </ul>
          </div>
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-purple-300 mb-1">授權提醒</h4>
            <p className="text-sm text-purple-200">
              首次使用需要先授權祭壇合約操作您的 NFT，
              這是區塊鏈安全機制的必要步驟。
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "執行神秘儀式",
    content: (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-yellow-300 mb-1">儀式流程</h4>
            <ol className="text-sm text-yellow-200 space-y-1 list-decimal list-inside">
              <li>確認選擇的祭品和規則</li>
              <li>點擊「開始升星」按鈕</li>
              <li>簽署區塊鏈交易</li>
              <li>等待交易確認</li>
              <li>觀看儀式動畫效果</li>
              <li>查看升星結果</li>
            </ol>
          </div>
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
            <h4 className="font-semibold text-red-300 mb-1">風險提醒</h4>
            <ul className="text-sm text-red-200 space-y-1">
              <li>• 升星有失敗風險，祭品可能完全消失</li>
              <li>• 高星級升星失敗率較高，請謹慎考慮</li>
              <li>• 交易一旦發送就無法撤回</li>
            </ul>
          </div>
        </div>
      </div>
    )
  },
  {
    title: "開始您的升星之旅",
    content: (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold text-white">準備好挑戰命運了嗎？</h3>
        </div>
        
        <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-purple-300 mb-2 text-center">
            升星小貼士
          </h4>
          <div className="space-y-1 text-sm text-purple-200">
            <p><strong>建議策略：</strong>先用低價值的 NFT 熟悉流程</p>
            <p><strong>數據分析：</strong>關注成功率圓形圖，理性評估風險</p>
            <p><strong>長期思維：</strong>高星級 NFT 價值更高，但風險也更大</p>
            <p><strong>社群討論：</strong>與其他玩家分享升星經驗</p>
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-gray-400 text-sm italic">
            "願星辰指引您的道路，祝您獲得傳說級的寶物！"
          </p>
        </div>
      </div>
    )
  }
];

export const AltarTutorial: React.FC<AltarTutorialProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  const currentTutorial = tutorialSteps[currentStep];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="使用教學"
      showCloseButton={false}
      maxWidth="2xl"
      isTutorial={true}
    >
      <div className="relative">
        {/* 進度條 */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">
              教學進度 {currentStep + 1} / {tutorialSteps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              跳過教學
            </button>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 教學內容 */}
        <div className="min-h-[250px] sm:min-h-[300px] max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center mb-4 sm:mb-6 bg-gradient-to-r from-purple-300 to-indigo-300 bg-clip-text text-transparent">
            {currentTutorial.title}
          </h2>
          
          <div className="mb-6 sm:mb-8">
            {currentTutorial.content}
          </div>
        </div>

        {/* 導航按鈕 */}
        <div className="flex justify-between items-center pt-3 sm:pt-4 border-t border-gray-700">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`px-3 sm:px-4 py-2 rounded-lg transition-all text-sm sm:text-base ${
              currentStep === 0
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gray-600 text-white hover:bg-gray-500'
            }`}
          >
            上一步
          </button>

          <div className="flex space-x-1 sm:space-x-2">
            {tutorialSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-purple-500'
                    : index < currentStep
                    ? 'bg-purple-300'
                    : 'bg-gray-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="px-4 sm:px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg transition-all text-sm sm:text-base"
          >
            {currentStep === tutorialSteps.length - 1 ? '開始體驗' : '下一步'}
          </button>
        </div>
      </div>
    </Modal>
  );
};