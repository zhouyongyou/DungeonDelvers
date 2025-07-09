import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

// 簡單的測試組件
const SimpleComponent = ({ text }: { text: string }) => {
  return <div data-testid="simple-text">{text}</div>
}

describe('基礎測試框架', () => {
  it('應該能渲染簡單組件', () => {
    render(<SimpleComponent text="Hello Test!" />)
    expect(screen.getByTestId('simple-text')).toBeInTheDocument()
    expect(screen.getByText('Hello Test!')).toBeInTheDocument()
  })

  it('應該能執行基本的斷言', () => {
    expect(1 + 1).toBe(2)
    expect('hello').toBe('hello')
    expect(true).toBeTruthy()
  })
})