// src/wagmi.ts (智能 RPC 版本)

import { createConfig } from 'wagmi';
import { bsc } from 'wagmi/chains';
import { createSmartRpcTransport } from './config/smartRpcTransport';

// 使用智能 RPC 傳輸層
export const wagmiConfig = createConfig({
  chains: [bsc],
  transports: {
    [bsc.id]: createSmartRpcTransport(),
  },
});
