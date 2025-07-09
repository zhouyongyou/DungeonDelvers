import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import MintPrice from '../../components/ui/MintPrice'

// Mock GraphQL 查詢
const GET_MINT_PRICE = gql`
  query GetMintPrice {
    config(id: "main-config") {
      id
      mintPrice
    }
  }
`

// Mock 數據
const mockData = {
  config: {
    id: 'main-config',
    mintPrice: '1000000000000000000', // 1 ETH in wei
  },
}

// Mock 查詢結果
const mocks = [
  {
    request: {
      query: GET_MINT_PRICE,
    },
    result: {
      data: mockData,
    },
  },
]

// Mock 錯誤查詢
const mockError = [
  {
    request: {
      query: GET_MINT_PRICE,
    },
    error: new Error('GraphQL error'),
  },
]

describe('MintPrice', () => {
  it('應該在載入時顯示載入訊息', () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MintPrice />
      </MockedProvider>
    )
    
    expect(screen.getByText('讀取價格中...')).toBeInTheDocument()
  })

  it('應該在錯誤時顯示錯誤訊息', async () => {
    render(
      <MockedProvider mocks={mockError} addTypename={false}>
        <MintPrice />
      </MockedProvider>
    )
    
    // 等待錯誤狀態出現
    const errorMessage = await screen.findByText(/讀取失敗:/)
    expect(errorMessage).toBeInTheDocument()
    expect(errorMessage).toHaveStyle({ color: 'rgb(255, 0, 0)' })
  })

  it('應該正確顯示價格數據', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MintPrice />
      </MockedProvider>
    )
    
    // 等待數據載入完成
    const title = await screen.findByText('當前鑄造價格')
    expect(title).toBeInTheDocument()
    
    const price = await screen.findByText('1.0000 ETH')
    expect(price).toBeInTheDocument()
  })

  it('應該正確轉換 wei 到 ETH', async () => {
    const customMocks = [
      {
        request: {
          query: GET_MINT_PRICE,
        },
        result: {
          data: {
            config: {
              id: 'main-config',
              mintPrice: '500000000000000000', // 0.5 ETH in wei
            },
          },
        },
      },
    ]
    
    render(
      <MockedProvider mocks={customMocks} addTypename={false}>
        <MintPrice />
      </MockedProvider>
    )
    
    const price = await screen.findByText('0.5000 ETH')
    expect(price).toBeInTheDocument()
  })

  it('應該在沒有價格數據時顯示預設訊息', async () => {
    const noDataMocks = [
      {
        request: {
          query: GET_MINT_PRICE,
        },
        result: {
          data: {
            config: null,
          },
        },
      },
    ]
    
    render(
      <MockedProvider mocks={noDataMocks} addTypename={false}>
        <MintPrice />
      </MockedProvider>
    )
    
    const message = await screen.findByText('暫無價格資訊')
    expect(message).toBeInTheDocument()
  })

  it('應該正確處理非常小的金額', async () => {
    const smallAmountMocks = [
      {
        request: {
          query: GET_MINT_PRICE,
        },
        result: {
          data: {
            config: {
              id: 'main-config',
              mintPrice: '1000000000000000', // 0.001 ETH in wei
            },
          },
        },
      },
    ]
    
    render(
      <MockedProvider mocks={smallAmountMocks} addTypename={false}>
        <MintPrice />
      </MockedProvider>
    )
    
    const price = await screen.findByText('0.0010 ETH')
    expect(price).toBeInTheDocument()
  })

  it('應該有正確的 HTML 結構', async () => {
    render(
      <MockedProvider mocks={mocks} addTypename={false}>
        <MintPrice />
      </MockedProvider>
    )
    
    const title = await screen.findByRole('heading', { level: 2 })
    expect(title).toBeInTheDocument()
    expect(title).toHaveTextContent('當前鑄造價格')
    
    const paragraph = await screen.findByText('1.0000 ETH')
    expect(paragraph.tagName).toBe('P')
  })
})