// src/components/common/PreviewFooterNote.tsx
// 預覽頁面的底部備註組件

import React from 'react';

export const PreviewFooterNote: React.FC = () => {
  return (
    <div className="mt-16 px-4 py-6 bg-gradient-to-r from-gray-900/50 via-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700/50">
      <div className="max-w-4xl mx-auto text-center space-y-3">
        <p className="text-sm text-gray-400">
          📌 <strong className="text-gray-300">備註</strong>：以上功能內容僅供參考，實際遊戲體驗可能會根據平衡性需求進行調整。
        </p>
        <p className="text-xs text-gray-500">
          部分功能將在未來版本陸續更新，部分進階功能將在第二代遊戲推出。
          <br />
          我們預計下一款全新遊戲將在 2-4 個月後推出，敬請期待！
        </p>
      </div>
    </div>
  );
};