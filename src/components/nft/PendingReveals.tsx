import React from 'react';
import { useAccount } from 'wagmi';
import { RevealStatus } from './RevealStatus';

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
        <RevealStatus contractType="hero" userAddress={address} />
        <RevealStatus contractType="relic" userAddress={address} />
      </div>
    </div>
  );
};