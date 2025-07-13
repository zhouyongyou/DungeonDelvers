import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock wagmi
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: '0x123456789',
    isConnected: true,
    chainId: 56,
  })),
  useReadContract: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
  })),
  useWriteContract: vi.fn(() => ({
    writeContractAsync: vi.fn(),
    isPending: false,
  })),
  usePublicClient: vi.fn(() => ({
    waitForTransactionReceipt: vi.fn(),
  })),
}));

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useQueryClient: vi.fn(() => ({
    setQueryData: vi.fn(),
    prefetchQuery: vi.fn(),
    invalidateQueries: vi.fn(),
  })),
  QueryClient: vi.fn(() => ({
    setQueryData: vi.fn(),
    prefetchQuery: vi.fn(),
    invalidateQueries: vi.fn(),
  })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock @apollo/client
vi.mock('@apollo/client', () => ({
  useQuery: vi.fn(() => ({
    data: null,
    loading: false,
    error: null,
    refetch: vi.fn(),
  })),
  useMutation: vi.fn(() => [
    vi.fn(),
    {
      loading: false,
      error: null,
    },
  ]),
  ApolloProvider: ({ children }: { children: React.ReactNode }) => children,
  gql: vi.fn((strings: TemplateStringsArray) => strings.join('')),
}));

// Mock zustand stores
vi.mock('../stores/useTransactionStore', () => ({
  useTransactionStore: vi.fn(() => ({
    transactions: [],
    addTransaction: vi.fn(),
    removeTransaction: vi.fn(),
    updateTransactionStatus: vi.fn(),
  })),
}));

// Mock environment variables
Object.defineProperty(window, 'import', {
  value: {
    meta: {
      env: {
        VITE_THE_GRAPH_STUDIO_API_URL: 'https://test-graph-api.com',
        VITE_ALCHEMY_BSC_MAINNET_RPC_URL: 'https://test-rpc.com',
        VITE_METADATA_SERVER_URL: 'https://test-metadata.com',
        VITE_DEVELOPER_ADDRESS: '0x123456789',
      },
    },
  },
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestIdleCallback
global.requestIdleCallback = vi.fn((callback) => {
  return setTimeout(callback, 0);
});

// Mock cancelIdleCallback
global.cancelIdleCallback = vi.fn((id) => {
  clearTimeout(id);
});

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-1234'),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
) as any;

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
    getEntriesByType: vi.fn(() => []),
  },
});

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'test',
    connection: {
      effectiveType: '4g',
    },
  },
});

// 為了提供更好的錯誤信息，設置控制台警告過濾
const originalWarn = console.warn;
console.warn = (...args) => {
  // 過濾掉一些測試中的預期警告
  const message = args.join(' ');
  if (
    message.includes('React.createElement: type is invalid') ||
    message.includes('Warning: Failed prop type')
  ) {
    return;
  }
  originalWarn(...args);
};