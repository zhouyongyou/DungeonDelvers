import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc, bscTestnet } from 'wagmi/chains';
import { ENV } from './env';

if (!ENV.WALLET_CONNECT_PROJECT_ID) {
  throw new Error('Missing VITE_WALLET_CONNECT_PROJECT_ID');
}

export const config = getDefaultConfig({
  appName: 'Dungeon Delvers',
  projectId: ENV.WALLET_CONNECT_PROJECT_ID,
  chains: [bsc, bscTestnet],
  ssr: false,
});

export const chains = [bsc, bscTestnet];
export const wagmiConfig = config; 