import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { Header } from '../../components/layout/Header'
import { wagmiConfig } from '../../wagmi'

// 測試包裝器
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}

describe('Header Component', () => {
  it('should render navigation items correctly', () => {
    const mockSetActivePage = vi.fn()
    
    render(
      <TestWrapper>
        <Header activePage="mint" setActivePage={mockSetActivePage} />
      </TestWrapper>
    )
    
    // 檢查主要導航項目是否渲染
    expect(screen.getByText(/鑄造/)).toBeInTheDocument()
    expect(screen.getByText(/探索/)).toBeInTheDocument()
    expect(screen.getByText(/我的資產/)).toBeInTheDocument()
    expect(screen.getByText(/地下城/)).toBeInTheDocument()
  })

  it('should call setActivePage when navigation item is clicked', () => {
    const mockSetActivePage = vi.fn()
    
    render(
      <TestWrapper>
        <Header activePage="mint" setActivePage={mockSetActivePage} />
      </TestWrapper>
    )
    
    // 模擬點擊探索按鈕
    const explorerButton = screen.getByText(/探索/)
    fireEvent.click(explorerButton)
    
    expect(mockSetActivePage).toHaveBeenCalledWith('explorer')
  })

  it('should highlight active page correctly', () => {
    const mockSetActivePage = vi.fn()
    
    render(
      <TestWrapper>
        <Header activePage="mint" setActivePage={mockSetActivePage} />
      </TestWrapper>
    )
    
    // 檢查活動頁面是否有正確的樣式
    const mintButton = screen.getByText(/鑄造/)
    expect(mintButton.closest('button')).toHaveClass('bg-indigo-100')
  })

  it('should show wallet connection status', () => {
    const mockSetActivePage = vi.fn()
    
    render(
      <TestWrapper>
        <Header activePage="mint" setActivePage={mockSetActivePage} />
      </TestWrapper>
    )
    
    // 檢查錢包連接按鈕是否存在
    expect(screen.getByText(/連接錢包/)).toBeInTheDocument()
  })
})