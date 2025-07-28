// V3 授權按鈕 - 手動觸發版本
import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { V3MigrationNotice } from './V3MigrationNotice';

export const V3AuthorizationButton: React.FC = () => {
  const { address, chainId } = useAccount();
  const [showModal, setShowModal] = useState(false);

  if (!address || chainId !== bsc.id) {
    return null;
  }

  // 檢查是否已經完成過授權
  const hasCompletedAuth = localStorage.getItem(`v3-auth-completed-${address}`) === 'true';

  return (
    <>
      {!hasCompletedAuth && (
        <div className="fixed bottom-20 right-4 z-40">
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-pulse"
          >
            <span className="text-lg">🚀</span>
            <span className="text-sm font-medium">V3 授權更新</span>
          </button>
        </div>
      )}
      
      {showModal && (
        <div className="fixed inset-0 z-50">
          <V3MigrationNotice />
        </div>
      )}
    </>
  );
};