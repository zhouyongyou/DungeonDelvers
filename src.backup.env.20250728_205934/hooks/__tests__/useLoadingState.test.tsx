import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useLoadingState } from '../useLoadingState';

describe('useLoadingState', () => {
  it('應該返回所有加載狀態渲染函數', () => {
    const { result } = renderHook(() => useLoadingState());

    expect(result.current).toHaveProperty('renderLoading');
    expect(result.current).toHaveProperty('renderTextLoading');
    expect(result.current).toHaveProperty('renderSkeletonLoading');
    expect(result.current).toHaveProperty('renderNumberLoading');
    expect(result.current).toHaveProperty('renderImageLoading');
    expect(result.current).toHaveProperty('renderButtonLoading');
    expect(result.current).toHaveProperty('createLoadingWrapper');
  });

  describe('renderLoading', () => {
    it('當不在加載時應該返回內容', () => {
      const { result } = renderHook(() => useLoadingState());
      const content = <div>Test Content</div>;
      
      const rendered = result.current.renderLoading(false, content);
      expect(rendered).toBe(content);
    });

    it('當加載時應該返回加載 spinner', () => {
      const { result } = renderHook(() => useLoadingState());
      const content = <div>Test Content</div>;
      
      const rendered = result.current.renderLoading(true, content);
      expect(rendered).not.toBe(content);
      // 這裡我們不能直接測試 JSX，但可以測試它不是原始內容
    });

    it('應該支持內聯模式', () => {
      const { result } = renderHook(() => useLoadingState());
      const content = <div>Test Content</div>;
      
      const rendered = result.current.renderLoading(true, content, { inline: true });
      expect(rendered).not.toBe(content);
    });

    it('應該支持自定義選項', () => {
      const { result } = renderHook(() => useLoadingState());
      const content = <div>Test Content</div>;
      
      const rendered = result.current.renderLoading(true, content, {
        size: 'lg',
        color: 'red',
        text: 'Loading...'
      });
      expect(rendered).not.toBe(content);
    });
  });

  describe('renderTextLoading', () => {
    it('當不在加載時應該返回內容', () => {
      const { result } = renderHook(() => useLoadingState());
      const content = <span>Test Text</span>;
      
      const rendered = result.current.renderTextLoading(false, content);
      expect(rendered).toBe(content);
    });

    it('當加載時應該返回佔位符', () => {
      const { result } = renderHook(() => useLoadingState());
      const content = <span>Test Text</span>;
      
      const rendered = result.current.renderTextLoading(true, content);
      expect(rendered).not.toBe(content);
    });

    it('應該支持自定義佔位符', () => {
      const { result } = renderHook(() => useLoadingState());
      const content = <span>Test Text</span>;
      
      const rendered = result.current.renderTextLoading(true, content, 'Custom Loading...');
      expect(rendered).not.toBe(content);
    });
  });

  describe('renderSkeletonLoading', () => {
    it('當不在加載時應該返回內容', () => {
      const { result } = renderHook(() => useLoadingState());
      const content = <div>Test Content</div>;
      
      const rendered = result.current.renderSkeletonLoading(false, content);
      expect(rendered).toBe(content);
    });

    it('當加載時應該返回骨架屏', () => {
      const { result } = renderHook(() => useLoadingState());
      const content = <div>Test Content</div>;
      
      const rendered = result.current.renderSkeletonLoading(true, content);
      expect(rendered).not.toBe(content);
    });

    it('應該支持自定義骨架屏配置', () => {
      const { result } = renderHook(() => useLoadingState());
      const content = <div>Test Content</div>;
      
      const rendered = result.current.renderSkeletonLoading(true, content, {
        lines: 3,
        width: 'w-1/2',
        height: 'h-6',
        className: 'custom-class'
      });
      expect(rendered).not.toBe(content);
    });
  });

  describe('renderNumberLoading', () => {
    it('當不在加載時應該返回格式化的數值', () => {
      const { result } = renderHook(() => useLoadingState());
      
      const rendered = result.current.renderNumberLoading(false, 123);
      expect(rendered).not.toBe(123); // 應該被包裝在 span 中
    });

    it('當加載時應該返回佔位符', () => {
      const { result } = renderHook(() => useLoadingState());
      
      const rendered = result.current.renderNumberLoading(true, 123);
      expect(rendered).not.toBe(123);
    });

    it('應該支持前綴和後綴', () => {
      const { result } = renderHook(() => useLoadingState());
      
      const rendered = result.current.renderNumberLoading(false, 123, {
        prefix: '$',
        suffix: ' USD'
      });
      expect(rendered).not.toBe(123);
    });

    it('應該支持自定義佔位符', () => {
      const { result } = renderHook(() => useLoadingState());
      
      const rendered = result.current.renderNumberLoading(true, 123, {
        placeholder: '---'
      });
      expect(rendered).not.toBe(123);
    });
  });

  describe('renderImageLoading', () => {
    it('當不在加載時應該返回圖片元素', () => {
      const { result } = renderHook(() => useLoadingState());
      const imageElement = <img src="test.jpg" alt="test" />;
      
      const rendered = result.current.renderImageLoading(false, imageElement);
      expect(rendered).toBe(imageElement);
    });

    it('當加載時應該返回佔位符', () => {
      const { result } = renderHook(() => useLoadingState());
      const imageElement = <img src="test.jpg" alt="test" />;
      
      const rendered = result.current.renderImageLoading(true, imageElement);
      expect(rendered).not.toBe(imageElement);
    });

    it('應該支持自定義縱橫比和類名', () => {
      const { result } = renderHook(() => useLoadingState());
      const imageElement = <img src="test.jpg" alt="test" />;
      
      const rendered = result.current.renderImageLoading(true, imageElement, {
        aspectRatio: 'aspect-video',
        className: 'custom-class'
      });
      expect(rendered).not.toBe(imageElement);
    });

    it('應該支持自定義佔位符', () => {
      const { result } = renderHook(() => useLoadingState());
      const imageElement = <img src="test.jpg" alt="test" />;
      const customPlaceholder = <div>Custom Placeholder</div>;
      
      const rendered = result.current.renderImageLoading(true, imageElement, {
        placeholder: customPlaceholder
      });
      expect(rendered).not.toBe(imageElement);
    });
  });

  describe('renderButtonLoading', () => {
    it('當不在加載時應該返回子元素', () => {
      const { result } = renderHook(() => useLoadingState());
      const children = <span>Click Me</span>;
      
      const rendered = result.current.renderButtonLoading(false, children);
      expect(rendered).toBe(children);
    });

    it('當加載時應該返回加載狀態', () => {
      const { result } = renderHook(() => useLoadingState());
      const children = <span>Click Me</span>;
      
      const rendered = result.current.renderButtonLoading(true, children);
      expect(rendered).not.toBe(children);
    });

    it('應該支持自定義加載文本', () => {
      const { result } = renderHook(() => useLoadingState());
      const children = <span>Click Me</span>;
      
      const rendered = result.current.renderButtonLoading(true, children, 'Submitting...');
      expect(rendered).not.toBe(children);
    });
  });

  describe('createLoadingWrapper', () => {
    it('應該創建帶有默認選項的包裝器', () => {
      const { result } = renderHook(() => useLoadingState());
      
      const wrapper = result.current.createLoadingWrapper({ size: 'lg' });
      expect(typeof wrapper).toBe('function');
      
      const content = <div>Test</div>;
      const wrapped = wrapper(false, content);
      expect(wrapped).toBe(content);
    });

    it('創建的包裝器應該能夠覆蓋默認選項', () => {
      const { result } = renderHook(() => useLoadingState());
      
      const wrapper = result.current.createLoadingWrapper({ size: 'lg' });
      const content = <div>Test</div>;
      
      const wrappedWithOverride = wrapper(false, content, { size: 'sm' });
      expect(wrappedWithOverride).toBe(content);
    });
  });
});