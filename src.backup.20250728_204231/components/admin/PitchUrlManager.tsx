import React, { useState, useEffect } from 'react';
import { generatePitchUrl, regeneratePitchRoute, getValidPitchRoute } from '../../utils/pitchAccess';
import { ActionButton } from '../ui/ActionButton';
import { useAppToast } from '../../hooks/useAppToast';

export const PitchUrlManager: React.FC = () => {
  const [pitchUrl, setPitchUrl] = useState<string>('');
  const [expiryHours, setExpiryHours] = useState<number>(72);
  const { showToast } = useAppToast();

  useEffect(() => {
    const validRoute = getValidPitchRoute();
    if (validRoute) {
      setPitchUrl(generatePitchUrl());
    }
  }, []);

  const handleGenerateUrl = () => {
    const newUrl = regeneratePitchRoute(expiryHours);
    setPitchUrl(newUrl);
    showToast('成功', '已生成新的 Pitch 頁面連結', 'success');
  };

  const handleCopyUrl = () => {
    if (pitchUrl) {
      navigator.clipboard.writeText(pitchUrl);
      showToast('已複製', '連結已複製到剪貼簿', 'success');
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-bold text-gray-100 mb-4">Pitch 頁面管理</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            連結有效期（小時）
          </label>
          <input
            type="number"
            value={expiryHours}
            onChange={(e) => setExpiryHours(Number(e.target.value))}
            min="1"
            max="720"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-100"
          />
        </div>

        <div className="flex gap-2">
          <ActionButton
            onClick={handleGenerateUrl}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            生成新連結
          </ActionButton>
        </div>

        {pitchUrl && (
          <div className="mt-4 p-4 bg-gray-700 rounded-md">
            <p className="text-sm text-gray-300 mb-2">當前 Pitch 頁面連結：</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pitchUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-gray-100 text-sm"
              />
              <ActionButton
                onClick={handleCopyUrl}
                className="bg-green-600 hover:bg-green-700"
              >
                複製
              </ActionButton>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              * 此連結將在 {expiryHours} 小時後失效
            </p>
          </div>
        )}

        <div className="mt-4 p-4 bg-gray-700 rounded-md">
          <p className="text-sm text-gray-300">使用說明：</p>
          <ul className="mt-2 text-xs text-gray-400 space-y-1">
            <li>• 生成的連結是隨機且有時效性的</li>
            <li>• 分享給 BNB Chain 或其他合作夥伴</li>
            <li>• 連結失效後需要重新生成</li>
            <li>• 頁面不會出現在公開導航中</li>
          </ul>
        </div>
      </div>
    </div>
  );
};