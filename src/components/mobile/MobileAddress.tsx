// 手機版地址顯示組件
import React, { useState } from 'react';
import { Icons } from '../ui/icons';
import { useAppToast } from '../../contexts/SimpleToastContext';

interface MobileAddressProps {
  address: string;
  className?: string;
  showCopy?: boolean;
  truncateLength?: number; // 前後各顯示幾個字符，預設 6
}

export const MobileAddress: React.FC<MobileAddressProps> = ({ 
  address, 
  className = '',
  showCopy = true,
  truncateLength = 6
}) => {
  const { showToast } = useAppToast();
  const [copied, setCopied] = useState(false);
  
  const truncatedAddress = `${address.slice(0, truncateLength)}...${address.slice(-truncateLength + 2)}`;
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      showToast('地址已複製', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      showToast('複製失敗', 'error');
    }
  };
  
  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      <span className="font-mono text-sm">{truncatedAddress}</span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
          title="複製地址"
        >
          {copied ? (
            <Icons.Check className="h-3 w-3 text-green-400" />
          ) : (
            <Icons.Copy className="h-3 w-3 text-gray-400" />
          )}
        </button>
      )}
    </div>
  );
};

// 長按顯示完整地址的版本
export const MobileAddressWithPreview: React.FC<MobileAddressProps> = ({ 
  address, 
  className = '',
  showCopy = true,
  truncateLength = 6
}) => {
  const [showFull, setShowFull] = useState(false);
  
  return (
    <div className="relative inline-block">
      <div
        onTouchStart={() => setShowFull(true)}
        onTouchEnd={() => setShowFull(false)}
        onMouseEnter={() => setShowFull(true)}
        onMouseLeave={() => setShowFull(false)}
      >
        <MobileAddress
          address={address}
          className={className}
          showCopy={showCopy}
          truncateLength={truncateLength}
        />
      </div>
      
      {showFull && (
        <div className="absolute z-50 bottom-full left-0 mb-2 p-2 bg-gray-900 text-white text-xs rounded shadow-lg max-w-[90vw] break-all">
          {address}
        </div>
      )}
    </div>
  );
};

export default MobileAddress;