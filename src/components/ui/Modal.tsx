import React, { useEffect, type ReactNode } from 'react';
import { ActionButton } from './ActionButton';

// 定義 Modal 元件接收的 props 型別
interface ModalProps {
  /** 是否顯示 Modal */
  isOpen: boolean;
  /** 關閉 Modal 時要執行的函式 */
  onClose: () => void;
  /** Modal 的標題 */
  title: string;
  /** Modal 中顯示的主要內容 */
  children: ReactNode;
  /** 按下確認按鈕時要執行的函式 */
  onConfirm: () => void;
  /** 確認按鈕上顯示的文字，預設為 '確認' */
  confirmText?: string;
  /** 確認按鈕是否處於載入中狀態 */
  isConfirming?: boolean;
  /** 確認按鈕的樣式變體，用於危險操作 */
  confirmVariant?: 'primary' | 'danger';
}

/**
 * Modal 是一個通用的對話方塊元件，用於需要用戶確認的重要操作。
 * 它包含一個半透明的背景遮罩，並支援鍵盤 Esc 鍵關閉。
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = '確認',
  isConfirming = false,
  confirmVariant = 'primary',
}) => {
  // 使用 useEffect 來處理鍵盤事件監聽
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // 當 Modal 開啟時，新增事件監聽
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    // 清理函數：當 Modal 關閉或元件卸載時，移除事件監聽
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]); // 這個 effect 的依賴項是 isOpen 和 onClose

  // 如果 Modal 不是開啟狀態，則不渲染任何東西
  if (!isOpen) {
    return null;
  }

  // 根據 variant 決定確認按鈕的顏色
  const confirmButtonClass = confirmVariant === 'danger' 
    ? 'bg-red-600 hover:bg-red-700' 
    : 'btn-primary'; // 使用我們在 index.css 中定義的全域樣式

  return (
    // 背景遮罩層
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 bg-black bg-opacity-70 z-[99] flex justify-center items-center backdrop-blur-sm"
      onClick={onClose} // 點擊背景遮罩時關閉 Modal
    >
      {/* Modal 內容卡片 */}
      <div
        className="card-bg p-6 rounded-2xl shadow-2xl w-full max-w-md m-4 animate-zoom-in"
        onClick={e => e.stopPropagation()} // 阻止點擊內容時觸發背景的 onClose
      >
        <h3 id="modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-100 font-serif mb-4">{title}</h3>
        <div className="text-gray-700 dark:text-gray-300 mb-6">{children}</div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition"
          >
            取消
          </button>
          <ActionButton
            onClick={onConfirm}
            isLoading={isConfirming}
            className={`w-28 h-10 ${confirmButtonClass}`}
          >
            {confirmText}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};
