import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';

// 測試用的 Mock 組件
export const MockWagmiProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-wagmi-provider">{children}</div>;
};

export const MockApolloProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-apollo-provider">{children}</div>;
};

// 創建測試專用的 QueryClient
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  });

// 全局測試包裝器
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  const testQueryClient = createTestQueryClient();

  return (
    <MockWagmiProvider>
      <MockApolloProvider>
        <QueryClientProvider client={testQueryClient}>
          {children}
        </QueryClientProvider>
      </MockApolloProvider>
    </MockWagmiProvider>
  );
};

// 自定義 render 函數
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// 重新導出所有 testing-library 的功能
export * from '@testing-library/react';
export { customRender as render };

// 測試數據生成器
export const createMockNft = (overrides = {}) => ({
  id: 1,
  name: 'Test NFT',
  description: 'A test NFT',
  image: 'https://test.com/image.png',
  type: 'hero' as const,
  rarity: 3,
  contractAddress: '0x123456789',
  tokenId: '1',
  owner: '0x987654321',
  ...overrides,
});

export const createMockHero = (overrides = {}) => ({
  ...createMockNft({ type: 'hero' }),
  power: 100,
  level: 5,
  class: 'Warrior',
  ...overrides,
});

export const createMockRelic = (overrides = {}) => ({
  ...createMockNft({ type: 'relic' }),
  capacity: 50,
  element: 'Fire',
  ...overrides,
});

export const createMockParty = (overrides = {}) => ({
  ...createMockNft({ type: 'party' }),
  totalPower: 500,
  totalCapacity: 200,
  partyRarity: 4,
  heroes: [createMockHero(), createMockHero()],
  relics: [createMockRelic()],
  ...overrides,
});

export const createMockVip = (overrides = {}) => ({
  ...createMockNft({ type: 'vip' }),
  level: 5,
  stakedAmount: '1000000000000000000', // 1 ETH in wei
  ...overrides,
});

// Mock hooks 返回值
export const createMockUseAccount = (overrides = {}) => ({
  address: '0x123456789abcdef',
  isConnected: true,
  chainId: 56,
  ...overrides,
});

export const createMockUseQuery = (overrides = {}) => ({
  data: null,
  isLoading: false,
  error: null,
  refetch: vi.fn(),
  ...overrides,
});

export const createMockUseContract = (overrides = {}) => ({
  data: null,
  isLoading: false,
  error: null,
  writeContractAsync: vi.fn(),
  isPending: false,
  ...overrides,
});

// 測試事件工具
export const mockTransactionHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

export const createMockTransaction = (overrides = {}) => ({
  hash: mockTransactionHash,
  status: 'pending' as const,
  description: 'Test transaction',
  timestamp: Date.now(),
  ...overrides,
});

// 等待工具
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0));
};

// 模擬用戶互動
export const mockUserEvent = async (element: HTMLElement, event = 'click') => {
  const { fireEvent } = await import('@testing-library/react');
  fireEvent[event as keyof typeof fireEvent](element);
};

// 測試環境檢查
export const isTestEnvironment = () => {
  return process.env.NODE_ENV === 'test' || typeof vi !== 'undefined';
};

// Mock 網路請求
export const mockFetch = (responseData: any, options: { ok?: boolean; status?: number } = {}) => {
  const { ok = true, status = 200 } = options;
  
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok,
      status,
      json: () => Promise.resolve(responseData),
      text: () => Promise.resolve(JSON.stringify(responseData)),
    })
  ) as any;
};

// 清理 Mock
export const cleanupMocks = () => {
  vi.clearAllMocks();
  localStorage.clear();
};

// 測試輔助斷言
export const expectElementToBeVisible = (element: HTMLElement | null) => {
  expect(element).toBeInTheDocument();
  expect(element).toBeVisible();
};

export const expectElementToHaveText = (element: HTMLElement | null, text: string) => {
  expect(element).toBeInTheDocument();
  expect(element).toHaveTextContent(text);
};

// 錯誤處理測試
export const expectToThrow = async (fn: () => Promise<any>, errorMessage?: string) => {
  try {
    await fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    if (errorMessage) {
      expect(error).toHaveProperty('message', errorMessage);
    }
  }
};