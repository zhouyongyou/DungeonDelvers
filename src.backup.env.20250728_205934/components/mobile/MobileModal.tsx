import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTouchGestures, useVirtualKeyboard } from '../../hooks/useMobileOptimization';
import { preventDoubleTapZoom } from '../../utils/mobileUtils';

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  fullScreen?: boolean;
  showCloseButton?: boolean;
  swipeToClose?: boolean;
}

export const MobileModal: React.FC<MobileModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  fullScreen = false,
  showCloseButton = true,
  swipeToClose = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { keyboardHeight } = useVirtualKeyboard();

  // 觸控手勢
  useTouchGestures(contentRef, {
    onSwipeDown: swipeToClose ? onClose : undefined,
    threshold: 100,
  });

  useEffect(() => {
    if (isOpen && modalRef.current) {
      preventDoubleTapZoom(modalRef.current);
      // 防止背景滾動
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 內容容器 */}
      <div
        ref={contentRef}
        className={`
          relative bg-gray-900 w-full transform transition-transform duration-300
          ${fullScreen 
            ? 'h-full' 
            : 'max-h-[90vh] rounded-t-2xl sm:rounded-2xl sm:max-w-lg sm:mx-4'
          }
        `}
        style={{
          paddingBottom: keyboardHeight ? `${keyboardHeight}px` : undefined,
        }}
      >
        {/* 滑動指示器（僅在非全屏模式） */}
        {!fullScreen && swipeToClose && (
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="w-12 h-1 bg-gray-600 rounded-full" />
          </div>
        )}

        {/* 標題欄 */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h3 className="text-lg font-semibold text-white flex-1">
              {title}
            </h3>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
                aria-label="關閉"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        {/* 內容區域 */}
        <div 
          className={`
            overflow-y-auto overscroll-contain
            ${fullScreen ? 'h-full' : 'max-h-[calc(90vh-8rem)]'}
          `}
        >
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};