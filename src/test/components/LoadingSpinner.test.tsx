import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'

describe('LoadingSpinner 組件', () => {
  it('應該能正常渲染', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.firstChild as HTMLElement
    
    expect(spinner).toBeInTheDocument()
    expect(spinner.tagName).toBe('DIV')
  })

  it('應該有默認的樣式類', () => {
    const { container } = render(<LoadingSpinner />)
    const spinner = container.firstChild as HTMLElement
    
    expect(spinner).toHaveClass('animate-spin')
    expect(spinner).toHaveClass('rounded-full')
    expect(spinner).toHaveClass('h-5')
    expect(spinner).toHaveClass('w-5')
    expect(spinner).toHaveClass('border-b-2')
    expect(spinner).toHaveClass('border-white')
  })

  it('應該能接受自定義大小', () => {
    const { container } = render(<LoadingSpinner size="h-10 w-10" />)
    const spinner = container.firstChild as HTMLElement
    
    expect(spinner).toHaveClass('h-10')
    expect(spinner).toHaveClass('w-10')
    expect(spinner).not.toHaveClass('h-5')
    expect(spinner).not.toHaveClass('w-5')
  })

  it('應該能接受自定義顏色', () => {
    const { container } = render(<LoadingSpinner color="border-blue-500" />)
    const spinner = container.firstChild as HTMLElement
    
    expect(spinner).toHaveClass('border-blue-500')
    expect(spinner).not.toHaveClass('border-white')
  })

  it('應該能同時接受自定義大小和顏色', () => {
    const { container } = render(
      <LoadingSpinner size="h-8 w-8" color="border-red-500" />
    )
    const spinner = container.firstChild as HTMLElement
    
    expect(spinner).toHaveClass('h-8')
    expect(spinner).toHaveClass('w-8')
    expect(spinner).toHaveClass('border-red-500')
    expect(spinner).toHaveClass('animate-spin')
    expect(spinner).toHaveClass('rounded-full')
  })
})