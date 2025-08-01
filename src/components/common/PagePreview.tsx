// src/components/common/PagePreview.tsx
// 通用頁面預覽組件

import React from 'react';
import { ActionButton } from '../ui/ActionButton';
import { PreviewFooterNote } from './PreviewFooterNote';

interface PagePreviewProps {
  title: string;
  description: string;
  icon: string;
  features: {
    title: string;
    description: string;
    icon: string;
  }[];
  requirements?: string[];
  benefits?: string[];
  gradient?: string;
}

export const PagePreview: React.FC<PagePreviewProps> = ({
  title,
  description,
  icon,
  features,
  requirements = [],
  benefits = [],
  gradient = 'from-indigo-900/20 to-purple-900/20'
}) => {
  const handleConnectWallet = () => {
    const connectButton = document.querySelector('[data-testid="rk-connect-button"]') as HTMLButtonElement;
    if (connectButton) {
      connectButton.click();
    } else {
      alert('請點擊右上角的「連接錢包」按鈕');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="text-6xl mb-4">{icon}</div>
        <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto px-4">
          {description}
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {features.map((feature, index) => (
          <div 
            key={index}
            className="bg-gray-800/50 rounded-lg p-4 md:p-6 border border-gray-700 hover:border-indigo-500/50 transition-all"
          >
            <div className="text-3xl mb-3">{feature.icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-gray-400">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Requirements and Benefits */}
      {(requirements.length > 0 || benefits.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          {requirements.length > 0 && (
            <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-lg p-6 border border-yellow-500/20">
              <h3 className="text-lg font-semibold text-yellow-400 mb-4 flex items-center">
                📋 使用需求
              </h3>
              <ul className="space-y-2">
                {requirements.map((req, index) => (
                  <li key={index} className="flex items-start text-gray-300">
                    <span className="text-yellow-400 mr-2">•</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {benefits.length > 0 && (
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg p-6 border border-green-500/20">
              <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center">
                ✨ 主要收益
              </h3>
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start text-gray-300">
                    <span className="text-green-400 mr-2">•</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Call to Action */}
      <div className={`text-center space-y-4 py-8 bg-gradient-to-r ${gradient} rounded-lg border border-indigo-500/20`}>
        <h3 className="text-lg md:text-xl font-semibold text-white">
          🚀 準備開始了嗎？
        </h3>
        <p className="text-sm md:text-base text-gray-300 max-w-2xl mx-auto px-4">
          連接您的錢包即可體驗完整功能，開始您的 DungeonDelvers 冒險之旅
        </p>
        <div className="flex justify-center">
          <ActionButton
            onClick={handleConnectWallet}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 px-6 md:px-8 py-2 md:py-3 text-base md:text-lg font-semibold"
          >
            🔗 連接錢包開始體驗
          </ActionButton>
        </div>
      </div>

      {/* 底部備註 */}
      <PreviewFooterNote />
    </div>
  );
};