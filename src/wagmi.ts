import { http, createConfig } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';

// 建議將這些 RPC URL 放在您的 .env.local 檔案中
// 例如: VITE_BSC_TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
const bscTestnetRpc = import.meta.env.VITE_BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const bscMainnetRpc = import.meta.env.VITE_BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org/';

export const wagmiConfig = createConfig({
  chains: [bsc, bscTestnet],
  // Wagmi 支援多個 RPC 端點，會自動處理故障轉移
  transports: {
    [bsc.id]: http(bscMainnetRpc),
    [bscTestnet.id]: http(bscTestnetRpc),
  },
});