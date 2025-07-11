// src/wagmi.ts (簡化版)

import { http, createConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { ENV } from './config/env';

// 簡化的 Wagmi 設定
export const wagmiConfig = createConfig({
  chains: [bsc],
  transports: {
    [bsc.id]: http(ENV.BSC_RPC),
  },
});
