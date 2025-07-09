import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SkeletonCard } from '../../components/ui/SkeletonCard'

describe('SkeletonCard', () => {
  it('應該渲染骨架卡片', () => {
    const { container } = render(<SkeletonCard />)
    const card = container.firstChild as HTMLElement
    expect(card).toBeInTheDocument()
    expect(card.tagName).toBe('DIV')
  })

  it('應該有正確的基本樣式', () => {
    const { container } = render(<SkeletonCard />)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('card-bg', 'p-3', 'rounded-lg', 'text-center')
    expect(card).toHaveClass('border-2', 'border-transparent', 'transition-all')
    expect(card).toHaveClass('overflow-hidden', 'animate-pulse')
  })

  it('應該包含圖片骨架', () => {
    const { container } = render(<SkeletonCard />)
    const imageSkeleton = container.querySelector('.aspect-square')
    expect(imageSkeleton).toBeInTheDocument()
    expect(imageSkeleton).toHaveClass('w-full', 'bg-gray-300', 'rounded-md', 'mb-2')
  })

  it('應該包含標題骨架', () => {
    const { container } = render(<SkeletonCard />)
    const titleSkeleton = container.querySelector('.h-5')
    expect(titleSkeleton).toBeInTheDocument()
    expect(titleSkeleton).toHaveClass('bg-gray-300', 'rounded', 'w-3/4', 'mx-auto', 'mb-2')
  })

  it('應該包含副標題骨架', () => {
    const { container } = render(<SkeletonCard />)
    const subtitleSkeleton = container.querySelector('.h-4')
    expect(subtitleSkeleton).toBeInTheDocument()
    expect(subtitleSkeleton).toHaveClass('bg-gray-300', 'rounded', 'w-1/2', 'mx-auto', 'mb-2')
  })

  it('應該包含底部骨架', () => {
    const { container } = render(<SkeletonCard />)
    const bottomSkeleton = container.querySelector('.h-6')
    expect(bottomSkeleton).toBeInTheDocument()
    expect(bottomSkeleton).toHaveClass('bg-gray-300', 'rounded', 'w-1/3', 'mx-auto')
  })

  it('應該包含四個骨架元素', () => {
    const { container } = render(<SkeletonCard />)
    const skeletonElements = container.querySelectorAll('.bg-gray-300')
    expect(skeletonElements).toHaveLength(4)
  })

  it('應該有脈搏動畫', () => {
    const { container } = render(<SkeletonCard />)
    const card = container.firstChild as HTMLElement
    expect(card).toHaveClass('animate-pulse')
  })
})