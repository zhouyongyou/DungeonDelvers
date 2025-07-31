// src/components/VictoryImageGenerator.tsx
// 勝利圖片生成器 - 用於生成可下載的勝利分享圖片

import React, { useRef, useCallback } from 'react';
import { formatEther } from 'viem';
import { ActionButton } from './ui/ActionButton';
import { Icons } from './ui/icons';
import { useAppToast } from '../contexts/SimpleToastContext';

interface VictoryImageGeneratorProps {
  reward: bigint;
  expGained: bigint;
  playerName?: string;
  className?: string;
}

export const VictoryImageGenerator: React.FC<VictoryImageGeneratorProps> = ({
  reward,
  expGained,
  playerName = '冒險者',
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showToast } = useAppToast();

  const generateImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 設置畫布尺寸 (適合社交媒體分享的尺寸)
    canvas.width = 1200;
    canvas.height = 630;

    // 背景漸變
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 添加裝飾性邊框
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

    // 內部邊框
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

    // 主標題
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 VICTORY! 🏆', canvas.width / 2, 150);

    // 副標題
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText('Dungeon Delvers', canvas.width / 2, 200);

    // 獎勵信息背景
    const rewardBoxY = 250;
    const rewardBoxHeight = 200;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
    ctx.fillRect(100, rewardBoxY, canvas.width - 200, rewardBoxHeight);
    
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.strokeRect(100, rewardBoxY, canvas.width - 200, rewardBoxHeight);

    // 獎勵數據
    const rewardAmount = parseFloat(formatEther(reward)).toFixed(1);
    const expAmount = expGained.toString();

    // SOUL 獎勵
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText('💰 獲得獎勵', canvas.width / 2, rewardBoxY + 60);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Arial, sans-serif';
    ctx.fillText(`${rewardAmount} $SOUL`, canvas.width / 2, rewardBoxY + 110);

    // 經驗值
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText(`⭐ +${expAmount} EXP`, canvas.width / 2, rewardBoxY + 160);

    // 底部信息
    ctx.fillStyle = '#9ca3af';
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText('加入 Dungeon Delvers 一起探索地下城！', canvas.width / 2, 520);
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText('www.dungeondelvers.xyz', canvas.width / 2, 560);

    // 添加一些裝飾元素
    // 左上角裝飾
    ctx.fillStyle = '#fbbf24';
    ctx.font = '60px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚔️', 80, 120);
    
    // 右上角裝飾
    ctx.textAlign = 'right';
    ctx.fillText('🛡️', canvas.width - 80, 120);

    // 底部裝飾
    ctx.textAlign = 'center';
    ctx.font = '40px Arial, sans-serif';
    ctx.fillText('🏰', canvas.width / 2 - 100, 580);
    ctx.fillText('🗡️', canvas.width / 2, 580);
    ctx.fillText('🏆', canvas.width / 2 + 100, 580);

  }, [reward, expGained, playerName]);

  const downloadImage = useCallback(async () => {
    try {
      await generateImage();
      
      const canvas = canvasRef.current;
      if (!canvas) return;

      // 轉換為 blob 並下載
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dungeon-delvers-victory-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('勝利圖片已下載！', 'success');
      }, 'image/png');
      
    } catch (error) {
      console.error('生成圖片失敗:', error);
      showToast('圖片生成失敗，請重試', 'error');
    }
  }, [generateImage, showToast]);

  const shareToTwitter = useCallback(async () => {
    try {
      await generateImage();
      
      const rewardAmount = parseFloat(formatEther(reward)).toFixed(1);
      const text = `我剛剛在《Dungeon Delvers》的遠征中大獲全勝！🏆\n\n💰 獲得了 ${rewardAmount} $SOUL\n⭐ 獲得了 ${expGained.toString()} 經驗值\n\n快來加入我，一起探索地下城吧！\n\n#DungeonDelvers #GameFi #BNBChain`;
      
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://www.dungeondelvers.xyz')}`;
      window.open(twitterUrl, '_blank');
      
      showToast('請在新視窗中完成分享，並手動上傳下載的圖片！', 'info');
    } catch (error) {
      console.error('分享失敗:', error);
      showToast('分享失敗，請重試', 'error');
    }
  }, [generateImage, reward, expGained, showToast]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 隱藏的 Canvas 元素用於生成圖片 */}
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        width={1200}
        height={630}
      />
      
      {/* 預覽區域 */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
        <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Icons.Image className="w-4 h-4" />
          勝利分享圖片
        </h4>
        
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 rounded-lg p-6 text-center border border-blue-500/30 mb-4">
          <div className="text-4xl mb-2">🏆</div>
          <h3 className="text-xl font-bold text-yellow-400 mb-2">VICTORY!</h3>
          <div className="space-y-2">
            <p className="text-green-400">
              💰 獲得: {parseFloat(formatEther(reward)).toFixed(1)} $SOUL
            </p>
            <p className="text-blue-400">
              ⭐ 經驗: +{expGained.toString()} EXP
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            1200x630 像素 - 適合社交媒體分享
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <ActionButton
            onClick={downloadImage}
            className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600"
          >
            <Icons.Download className="w-4 h-4 mr-2" />
            下載圖片
          </ActionButton>
          
          <ActionButton
            onClick={shareToTwitter}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600"
          >
            <Icons.Twitter className="w-4 h-4 mr-2" />
            分享到 X
          </ActionButton>
        </div>
        
        <p className="text-xs text-gray-500 mt-3 text-center">
          💡 提示：點擊「分享到 X」會開啟新視窗，請手動上傳剛下載的圖片以獲得最佳效果
        </p>
      </div>
    </div>
  );
};