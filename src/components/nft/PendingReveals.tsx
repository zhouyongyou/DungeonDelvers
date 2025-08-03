import React from 'react';
import { useAccount } from 'wagmi';
import { UniversalRevealStatus } from '../reveal/UniversalRevealStatus';

interface PendingRevealsProps {
  className?: string;
}

export const PendingReveals: React.FC<PendingRevealsProps> = ({
  className = '',
}) => {
  const { address } = useAccount();

  if (!address) {
    return null;
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-lg font-bold text-white mb-4">
        🎲 待揭示的 NFT
      </h2>
      
      <div className="grid gap-4 md:grid-cols-2">
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
    </div>
  );
};