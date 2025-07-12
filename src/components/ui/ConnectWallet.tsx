import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Card } from './Card';

export const ConnectWallet: React.FC = () => {
  return (
    <Card className="text-center">
      <h2 className="text-2xl font-bold text-white mb-4">連接錢包</h2>
      <p className="text-gray-300 mb-6">
        請連接您的錢包以開始使用 Dungeon Delvers
      </p>
      <ConnectButton />
    </Card>
  );
}; 