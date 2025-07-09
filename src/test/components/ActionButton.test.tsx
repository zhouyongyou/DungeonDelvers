import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ActionButton } from '../../components/ui/ActionButton'

describe('ActionButton', () => {
  it('應該渲染按鈕與子元件', () => {
    render(<ActionButton>點擊我</ActionButton>)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
    expect(screen.getByText('點擊我')).toBeInTheDocument()
  })

  it('應該有正確的基本樣式', () => {
    render(<ActionButton>測試</ActionButton>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('btn-primary', 'flex', 'justify-center', 'items-center')
    expect(button).toHaveClass('transition-all', 'duration-300')
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
    expect(button).toHaveClass('active:scale-95')
  })

  it('應該接受自定義 className', () => {
    render(<ActionButton className="custom-class">測試</ActionButton>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('應該在 isLoading 為 true 時顯示載入指示器', () => {
    render(<ActionButton isLoading>載入中</ActionButton>)
    const button = screen.getByRole('button')
    
    // 應該顯示載入指示器而非文字
    expect(button.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByText('載入中')).not.toBeInTheDocument()
  })

  it('應該在 isLoading 為 false 時顯示子元件', () => {
    render(<ActionButton isLoading={false}>正常文字</ActionButton>)
    const button = screen.getByRole('button')
    
    expect(screen.getByText('正常文字')).toBeInTheDocument()
    expect(button.querySelector('.animate-spin')).not.toBeInTheDocument()
  })

  it('應該在載入時自動禁用按鈕', () => {
    render(<ActionButton isLoading>載入中</ActionButton>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('應該處理 disabled 屬性', () => {
    render(<ActionButton disabled>禁用按鈕</ActionButton>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('應該在 disabled 和 isLoading 同時為 true 時保持禁用', () => {
    render(<ActionButton disabled isLoading>測試</ActionButton>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('應該處理 onClick 事件', () => {
    const handleClick = vi.fn()
    render(<ActionButton onClick={handleClick}>點擊測試</ActionButton>)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('應該在載入時不觸發 onClick', () => {
    const handleClick = vi.fn()
    render(<ActionButton isLoading onClick={handleClick}>載入中</ActionButton>)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('應該在禁用時不觸發 onClick', () => {
    const handleClick = vi.fn()
    render(<ActionButton disabled onClick={handleClick}>禁用</ActionButton>)
    
    const button = screen.getByRole('button')
    fireEvent.click(button)
    
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('應該傳遞其他 HTML 按鈕屬性', () => {
    render(<ActionButton type="submit" data-testid="submit-btn">提交</ActionButton>)
    const button = screen.getByRole('button')
    
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveAttribute('data-testid', 'submit-btn')
  })

  it('應該能渲染 React 元件作為子元件', () => {
    render(
      <ActionButton>
        <span>圖示</span>
        <span>文字</span>
      </ActionButton>
    )
    
    expect(screen.getByText('圖示')).toBeInTheDocument()
    expect(screen.getByText('文字')).toBeInTheDocument()
  })
})