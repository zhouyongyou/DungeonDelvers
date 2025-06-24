import React, { ReactNode } from 'react';
import { ActionButton } from './ActionButton';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onConfirm: () => void;
  confirmText?: string;
  isConfirming?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = '確認',
  isConfirming = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 z-[99] flex justify-center items-center backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-[#FDF6E3] rounded-xl shadow-2xl p-6 w-full max-w-md m-4 animate-zoom-in"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-2xl font-bold text-[#2D2A4A] font-serif mb-4">{title}</h3>
        <div className="text-gray-700 mb-6">{children}</div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            取消
          </button>
          <ActionButton
            onClick={onConfirm}
            isLoading={isConfirming}
            className="px-4 py-2 rounded-lg w-28 h-10"
          >
            {confirmText}
          </ActionButton>
        </div>
      </div>
    </div>
  );
};
