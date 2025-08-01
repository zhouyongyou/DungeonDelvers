// src/components/ui/AddressDisplay.tsx
// 統一的地址顯示組件，處理響應式和複製功能

import React, { useState } from 'react';
import { Icons } from './icons';

interface AddressDisplayProps {
  address: string;
  showCopy?: boolean;
  className?: string;
  truncate?: boolean;
  variant?: 'default' | 'compact' | 'code';
}

export const AddressDisplay: React.FC<AddressDisplayProps> = ({
  address,
  showCopy = true,
  className = '',
  truncate = true,
  variant = 'default'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!address) return;
    
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr || addr === '0x0000000000000000000000000000000000000000') {
      return '未設置';
    }
    if (!truncate) return addr;
    
    // 響應式截斷
    return (
      <>
        {/* 手機版：顯示更短的地址 */}
        <span className="sm:hidden">{`${addr.slice(0, 4)}...${addr.slice(-4)}`}</span>
        {/* 平板和桌面版：顯示較長的地址 */}
        <span className="hidden sm:inline">{`${addr.slice(0, 6)}...${addr.slice(-6)}`}</span>
      </>
    );
  };

  const baseClasses = {
    default: 'font-mono text-sm',
    compact: 'font-mono text-xs',
    code: 'font-mono text-xs bg-gray-700 px-2 py-1 rounded'
  };

  if (!showCopy) {
    return (
      <span className={`${baseClasses[variant]} ${className} break-all`}>
        {formatAddress(address)}
      </span>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={`
        ${baseClasses[variant]} 
        ${className}
        inline-flex items-center gap-2 
        hover:bg-gray-700/50 
        transition-colors 
        cursor-pointer 
        group
        break-all
        max-w-full
      `}
      title={`點擊複製地址: ${address}`}
    >
      <span className="truncate">{formatAddress(address)}</span>
      {copied ? (
        <Icons.Check className="w-3 h-3 text-green-400 flex-shrink-0" />
      ) : (
        <Icons.Copy className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors flex-shrink-0" />
      )}
    </button>
  );
};

// 複製圖標組件（如果 Icons 中沒有）
const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>
);