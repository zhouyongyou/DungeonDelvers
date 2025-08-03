import React from 'react';
import { useAccount } from 'wagmi';
import { RevealStatus } from '../nft/RevealStatus';
import { DungeonRevealStatus } from '../dungeon/DungeonRevealStatus';
import { AltarRevealStatus } from '../altar/AltarRevealStatus';

interface AllPendingRevealsProps {
  className?: string;
}

export const AllPendingReveals: React.FC<AllPendingRevealsProps> = ({
  className = '',
}) => {
  const { address } = useAccount();

  if (!address) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">🎲</span>
          待揭示操作中心
        </h2>
        
        <p className="text-sm text-gray-400 mb-6">
          所有需要揭示的操作都會顯示在這裡。請在時限內完成揭示，否則將無法獲得預期結果。
        </p>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* NFT 鑄造揭示 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300">NFT 鑄造</h3>
            <RevealStatus contractType="hero" />
            <RevealStatus contractType="relic" />
          </div>
          
          {/* 地城探索揭示 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300">地城探索</h3>
            <DungeonRevealStatus />
          </div>
          
          {/* 升星祭壇揭示 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300">升星祭壇</h3>
            <AltarRevealStatus />
          </div>
        </div>
        
        <div className="mt-6 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">💡 揭示機制說明</h4>
          <ul className="text-xs text-blue-300 space-y-1">
            <li>• 提交操作後需等待 3 個區塊（約 2.25 秒）才能揭示</li>
            <li>• 必須在 255 個區塊內（約 3.2 分鐘）完成揭示</li>
            <li>• 過期未揭示將自動失敗或獲得最低結果</li>
            <li>• 任何人都可以幫助他人揭示，但過期強制揭示會有懲罰</li>
          </ul>
        </div>
      </div>
    </div>
  );
};