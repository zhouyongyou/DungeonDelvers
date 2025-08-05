import React from 'react';
import { PendingReveals } from '../../components/nft/PendingReveals';

interface MyAssetsRevealSectionProps {
  className?: string;
}

export const MyAssetsRevealSection: React.FC<MyAssetsRevealSectionProps> = ({
  className = '',
}) => {
  return (
    <div className={`mb-8 ${className}`}>
      <PendingReveals defaultExpanded={false} />
    </div>
  );
};