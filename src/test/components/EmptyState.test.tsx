import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { EmptyState } from '../../components/ui/EmptyState'

describe('EmptyState', () => {
  it('應該渲染空狀態組件', () => {
    render(<EmptyState message="沒有資料" />)
    const emptyState = screen.getByText('沒有資料')
    expect(emptyState).toBeInTheDocument()
  })

  it('應該顯示傳入的訊息', () => {
    const message = '沒有找到任何英雄'
    render(<EmptyState message={message} />)
    expect(screen.getByText(message)).toBeInTheDocument()
  })

  it('應該有正確的樣式類', () => {
    render(<EmptyState message="測試訊息" />)
    const container = screen.getByText('測試訊息').closest('div')
    expect(container).toHaveClass('text-center', 'py-10', 'px-4', 'card-bg', 'rounded-xl')
  })

  it('應該渲染傳入的子元件', () => {
    render(
      <EmptyState message="沒有資料">
        <button>重新載入</button>
      </EmptyState>
    )
    expect(screen.getByText('沒有資料')).toBeInTheDocument()
    expect(screen.getByText('重新載入')).toBeInTheDocument()
  })

  it('應該能渲染多個子元件', () => {
    render(
      <EmptyState message="空狀態">
        <button>按鈕1</button>
        <button>按鈕2</button>
      </EmptyState>
    )
    expect(screen.getByText('空狀態')).toBeInTheDocument()
    expect(screen.getByText('按鈕1')).toBeInTheDocument()
    expect(screen.getByText('按鈕2')).toBeInTheDocument()
  })

  it('應該在沒有子元件時正常渲染', () => {
    render(<EmptyState message="只有訊息" />)
    const messageElement = screen.getByText('只有訊息')
    expect(messageElement).toBeInTheDocument()
    expect(messageElement.tagName).toBe('P')
  })

  it('訊息應該有正確的樣式', () => {
    render(<EmptyState message="測試" />)
    const messageElement = screen.getByText('測試')
    expect(messageElement).toHaveClass('text-gray-500', 'mb-4')
  })
})