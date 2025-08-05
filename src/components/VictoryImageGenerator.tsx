// src/components/VictoryImageGenerator.tsx
// 勝利圖片生成器 - 用於生成可下載的勝利分享圖片

import React, { useRef, useCallback } from 'react';
import { formatEther } from 'viem';
import { ActionButton } from './ui/ActionButton';
import { Icons } from './ui/icons';
import { useAppToast } from '../contexts/SimpleToastContext';
import { useSoulPrice } from '../hooks/useSoulPrice';

interface VictoryImageGeneratorProps {
  reward: bigint;
  expGained: bigint;
  playerName?: string;
  dungeonName?: string;
  partyPower?: number;
  partyImageUrl?: string;
  className?: string;
}

export const VictoryImageGenerator: React.FC<VictoryImageGeneratorProps> = ({
  reward,
  expGained,
  playerName = '冒險者',
  dungeonName = '神秘地下城',
  partyPower = 0,
  partyImageUrl,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { showToast } = useAppToast();
  const { formatSoulToUsd, hasValidPrice } = useSoulPrice();

  const generateImage = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 設置畫布尺寸 (適合社交媒體分享的尺寸)
    canvas.width = 1200;
    canvas.height = 630;

    // 增強的背景漸變
    const gradient = ctx.createRadialGradient(600, 315, 0, 600, 315, 800);
    gradient.addColorStop(0, '#2d1b69');
    gradient.addColorStop(0.3, '#1e1b3a');
    gradient.addColorStop(0.6, '#0f172a');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 添加星空效果
    const stars = 50;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < stars; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2 + 1;
      ctx.globalAlpha = Math.random() * 0.8 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 增強的裝飾性邊框
    const borderGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    borderGradient.addColorStop(0, '#fbbf24');
    borderGradient.addColorStop(0.5, '#f59e0b');
    borderGradient.addColorStop(1, '#fbbf24');
    ctx.strokeStyle = borderGradient;
    ctx.lineWidth = 12;
    ctx.strokeRect(15, 15, canvas.width - 30, canvas.height - 30);

    // 內部邊框 - 魔法效果
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(35, 35, canvas.width - 70, canvas.height - 70);
    ctx.setLineDash([]);

    // 主標題 - 發光效果
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 80px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 VICTORY! 🏆', canvas.width / 2, 140);
    ctx.shadowBlur = 0;

    // 副標題
    ctx.fillStyle = '#e5e7eb';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillText('Dungeon Delvers', canvas.width / 2, 180);
    
    // 地下城名稱
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText(`⚔️ ${dungeonName} 征服成功！`, canvas.width / 2, 210);

    // 增強的獎勵信息區域
    const rewardBoxY = 240;
    const rewardBoxHeight = 220;
    
    // 左側獎勵框
    const leftBoxGradient = ctx.createLinearGradient(80, rewardBoxY, 80, rewardBoxY + rewardBoxHeight);
    leftBoxGradient.addColorStop(0, 'rgba(34, 197, 94, 0.3)');
    leftBoxGradient.addColorStop(1, 'rgba(34, 197, 94, 0.1)');
    ctx.fillStyle = leftBoxGradient;
    ctx.fillRect(80, rewardBoxY, canvas.width / 2 - 100, rewardBoxHeight);
    
    // 右側統計框
    const rightBoxGradient = ctx.createLinearGradient(canvas.width / 2 + 20, rewardBoxY, canvas.width / 2 + 20, rewardBoxY + rewardBoxHeight);
    rightBoxGradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
    rightBoxGradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');
    ctx.fillStyle = rightBoxGradient;
    ctx.fillRect(canvas.width / 2 + 20, rewardBoxY, canvas.width / 2 - 100, rewardBoxHeight);
    
    // 邊框
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, rewardBoxY, canvas.width / 2 - 100, rewardBoxHeight);
    
    ctx.strokeStyle = '#3b82f6';
    ctx.strokeRect(canvas.width / 2 + 20, rewardBoxY, canvas.width / 2 - 100, rewardBoxHeight);

    // 獎勵數據
    const rewardAmount = parseFloat(formatEther(reward)).toFixed(1);
    const expAmount = expGained.toString();
    const usdValue = hasValidPrice ? formatSoulToUsd(rewardAmount) : null;

    // 左側 - SOUL 獎勵
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💰 SOUL 獲得', 80 + (canvas.width / 2 - 100) / 2, rewardBoxY + 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText(rewardAmount, 80 + (canvas.width / 2 - 100) / 2, rewardBoxY + 90);
    
    ctx.fillStyle = '#22c55e';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('$SOUL', 80 + (canvas.width / 2 - 100) / 2, rewardBoxY + 120);

    // USD 價值
    if (usdValue) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 20px Arial, sans-serif';
      ctx.fillText(`≈ $${usdValue} USD`, 80 + (canvas.width / 2 - 100) / 2, rewardBoxY + 150);
    }

    // 右側 - 經驗值和戰力
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillText('⭐ 經驗 & 戰力', canvas.width / 2 + 20 + (canvas.width / 2 - 100) / 2, rewardBoxY + 40);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText(`+${expAmount}`, canvas.width / 2 + 20 + (canvas.width / 2 - 100) / 2, rewardBoxY + 85);
    
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillText('經驗值', canvas.width / 2 + 20 + (canvas.width / 2 - 100) / 2, rewardBoxY + 110);
    
    // 隊伍戰力
    if (partyPower > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 28px Arial, sans-serif';
      ctx.fillText(`⚔️ ${partyPower.toLocaleString()}`, canvas.width / 2 + 20 + (canvas.width / 2 - 100) / 2, rewardBoxY + 145);
      
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillText('隊伍戰力', canvas.width / 2 + 20 + (canvas.width / 2 - 100) / 2, rewardBoxY + 165);
    }

    // 增強的底部信息
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎮 加入 Dungeon Delvers 開始你的冒險之旅！', canvas.width / 2, 500);
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '20px Arial, sans-serif';
    ctx.fillText('🌐 www.dungeondelvers.xyz | 🚀 在 BNB Chain 上的 GameFi', canvas.width / 2, 530);
    
    // 社交媒體標籤
    ctx.fillStyle = '#a855f7';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('#DungeonDelvers #GameFi #BNBChain #NFT #Play2Earn', canvas.width / 2, 560);

    // 增強的裝飾元素
    // 左上角 - 劍盾組合
    ctx.fillStyle = '#fbbf24';
    ctx.font = '48px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚔️', 60, 100);
    ctx.fillText('🛡️', 110, 100);
    
    // 右上角 - 寶石裝飾
    ctx.textAlign = 'right';
    ctx.fillText('💎', canvas.width - 110, 100);
    ctx.fillText('🏆', canvas.width - 60, 100);

    // 底部裝飾 - 地下城主題
    ctx.textAlign = 'center';
    ctx.font = '36px Arial, sans-serif';
    ctx.fillText('🏰', canvas.width / 2 - 150, 590);
    ctx.fillText('🗡️', canvas.width / 2 - 75, 590);
    ctx.fillText('💰', canvas.width / 2, 590);
    ctx.fillText('⭐', canvas.width / 2 + 75, 590);
    ctx.fillText('🔮', canvas.width / 2 + 150, 590);
    
    // 添加魔法粒子效果
    const particles = 20;
    ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < particles; i++) {
      const x = 100 + Math.random() * (canvas.width - 200);
      const y = 480 + Math.random() * 100;
      const size = Math.random() * 3 + 1;
      ctx.globalAlpha = Math.random() * 0.6 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

  }, [reward, expGained, playerName, dungeonName, partyPower, hasValidPrice, formatSoulToUsd]);

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
      const usdValue = hasValidPrice ? formatSoulToUsd(rewardAmount) : null;
      const soulDisplay = usdValue ? `${rewardAmount} $SOUL ($${usdValue} USD)` : `${rewardAmount} $SOUL`;
      
      const text = `我剛剛在《Dungeon Delvers》的遠征中大獲全勝！🏆\n\n💰 獲得了 ${soulDisplay}\n⭐ 獲得了 ${expGained.toString()} 經驗值\n\n快來加入我，一起探索地下城吧！\n\n#DungeonDelvers #GameFi #BNBChain`;
      
      const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://www.dungeondelvers.xyz')}`;
      window.open(twitterUrl, '_blank');
      
      showToast('請在新視窗中完成分享，並手動上傳下載的圖片！', 'info');
    } catch (error) {
      console.error('分享失敗:', error);
      showToast('分享失敗，請重試', 'error');
    }
  }, [generateImage, reward, expGained, showToast, hasValidPrice, formatSoulToUsd]);

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
          <p className="text-purple-400 text-sm mb-3">⚔️ {dungeonName} 征服成功！</p>
          
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div className="bg-green-900/20 rounded-lg p-3">
              <p className="text-green-400 text-sm">💰 SOUL 獲得</p>
              <p className="text-white font-bold text-lg">
                {parseFloat(formatEther(reward)).toFixed(1)}
              </p>
              {hasValidPrice && (
                <p className="text-yellow-400 text-xs">
                  ≈ ${formatSoulToUsd(parseFloat(formatEther(reward)).toFixed(1))} USD
                </p>
              )}
            </div>
            
            <div className="bg-blue-900/20 rounded-lg p-3">
              <p className="text-blue-400 text-sm">⭐ 經驗 & 戰力</p>
              <p className="text-white font-bold text-lg">+{expGained.toString()}</p>
              {partyPower > 0 && (
                <p className="text-orange-400 text-xs">
                  ⚔️ {partyPower.toLocaleString()} 戰力
                </p>
              )}
            </div>
          </div>
          
          <p className="text-xs text-gray-400">
            1200x630 像素 - 精美設計，適合社交媒體分享
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