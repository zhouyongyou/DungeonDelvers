import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('應該渲染 Loading Spinner', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('應該使用預設的大小和顏色', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toHaveClass('h-5', 'w-5', 'border-white')
  })

  it('應該接受自定義大小', () => {
    const { container } = render(<LoadingSpinner size="h-10 w-10" />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toHaveClass('h-10', 'w-10')
  })

  it('應該接受自定義顏色', () => {
    const { container } = render(<LoadingSpinner color="border-blue-500" />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toHaveClass('border-blue-500')
  })

  it('應該有旋轉動畫類', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toHaveClass('animate-spin')
  })

  it('應該有正確的基本樣式', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toHaveClass('rounded-full', 'border-b-2')
  })

  it('應該同時接受自定義大小和顏色', () => {
    const { container } = render(<LoadingSpinner size="h-8 w-8" color="border-red-500" />)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toHaveClass('h-8', 'w-8', 'border-red-500')
  })
})