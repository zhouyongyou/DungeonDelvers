import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { UniversalRevealStatus } from '../reveal/UniversalRevealStatus';

interface PendingRevealsProps {
  className?: string;
  defaultExpanded?: boolean;
}

export const PendingReveals: React.FC<PendingRevealsProps> = ({
  className = '',
  defaultExpanded = false,
}) => {
  const { address } = useAccount();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!address) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div 
        className="flex items-center justify-between cursor-pointer p-3 bg-gray-800 rounded-lg border border-gray-700 hover:bg-gray-750 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-bold text-white">
          🎲 待揭示的 NFT
        </h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">
            {isExpanded ? '點擊收起' : '點擊展開'}
          </span>
          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="grid gap-4 md:grid-cols-2 animate-fadeIn">
          <UniversalRevealStatus 
            revealType="mint" 
            contractType="hero" 
            userAddress={address} 
          />
          <UniversalRevealStatus 
            revealType="mint" 
            contractType="relic" 
            userAddress={address} 
          />
        </div>
      )}
    </div>
  );
};