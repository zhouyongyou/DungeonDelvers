import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  isMobile, 
  isTouchDevice, 
  getViewportSize, 
  isVirtualKeyboardOpen,
  getSafeAreaInsets 
} from '../utils/mobileUtils';

interface MobileState {
  isMobile: boolean;
  isTouch: boolean;
  viewport: { width: number; height: number };
  isKeyboardOpen: boolean;
  safeAreaInsets: { top: number; right: number; bottom: number; left: number };
  orientation: 'portrait' | 'landscape';
}

export function useMobileOptimization() {
  const [state, setState] = useState<MobileState>(() => ({
    isMobile: isMobile(),
    isTouch: isTouchDevice(),
    viewport: getViewportSize(),
    isKeyboardOpen: false,
    safeAreaInsets: getSafeAreaInsets(),
    orientation: window.innerWidth < window.innerHeight ? 'portrait' : 'landscape',
  }));

  useEffect(() => {
    const updateState = () => {
      setState({
        isMobile: isMobile(),
        isTouch: isTouchDevice(),
        viewport: getViewportSize(),
        isKeyboardOpen: isVirtualKeyboardOpen(),
        safeAreaInsets: getSafeAreaInsets(),
        orientation: window.innerWidth < window.innerHeight ? 'portrait' : 'landscape',
      });
    };

    // 監聽各種事件
    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', updateState);
    
    // 視口變化監聽
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateState);
    }

    // 初始更新
    updateState();

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateState);
      }
    };
  }, []);

  return state;
}

// 觸控手勢 Hook
export function useTouchGestures(
  elementRef: React.RefObject<HTMLElement>,
  options: {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
    onPinch?: (scale: number) => void;
    threshold?: number;
  } = {}
) {
  const { threshold = 50 } = options;
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const initialDistanceRef = useRef<number | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          time: Date.now(),
        };
      } else if (e.touches.length === 2 && options.onPinch) {
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialDistanceRef.current = distance;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && options.onPinch && initialDistanceRef.current) {
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = distance / initialDistanceRef.current;
        options.onPinch(scale);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current || e.changedTouches.length !== 1) return;

      const touchEnd = {
        x: e.changedTouches[0].clientX,
        y: e.changedTouches[0].clientY,
        time: Date.now(),
      };

      const deltaX = touchEnd.x - touchStartRef.current.x;
      const deltaY = touchEnd.y - touchStartRef.current.y;
      const deltaTime = touchEnd.time - touchStartRef.current.time;

      // 快速滑動檢測
      if (deltaTime < 300) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // 水平滑動
          if (Math.abs(deltaX) > threshold) {
            if (deltaX > 0) {
              options.onSwipeRight?.();
            } else {
              options.onSwipeLeft?.();
            }
          }
        } else {
          // 垂直滑動
          if (Math.abs(deltaY) > threshold) {
            if (deltaY > 0) {
              options.onSwipeDown?.();
            } else {
              options.onSwipeUp?.();
            }
          }
        }
      }

      touchStartRef.current = null;
      initialDistanceRef.current = null;
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, options, threshold]);
}

// 虛擬鍵盤處理 Hook
export function useVirtualKeyboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const updateKeyboardState = () => {
      const open = isVirtualKeyboardOpen();
      setIsOpen(open);
      
      if (open && window.visualViewport) {
        const height = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(Math.max(0, height));
      } else {
        setKeyboardHeight(0);
      }
    };

    // 監聽焦點事件
    const handleFocus = (e: FocusEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        setTimeout(updateKeyboardState, 300);
      }
    };

    const handleBlur = () => {
      setTimeout(updateKeyboardState, 300);
    };

    window.addEventListener('focusin', handleFocus);
    window.addEventListener('focusout', handleBlur);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateKeyboardState);
    }

    return () => {
      window.removeEventListener('focusin', handleFocus);
      window.removeEventListener('focusout', handleBlur);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateKeyboardState);
      }
    };
  }, []);

  return { isOpen, keyboardHeight };
}

// 響應式斷點 Hook
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'>('xl');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint('xs');
      else if (width < 768) setBreakpoint('sm');
      else if (width < 1024) setBreakpoint('md');
      else if (width < 1280) setBreakpoint('lg');
      else if (width < 1536) setBreakpoint('xl');
      else setBreakpoint('2xl');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobileBreakpoint: breakpoint === 'xs' || breakpoint === 'sm',
    isTabletBreakpoint: breakpoint === 'md',
    isDesktopBreakpoint: breakpoint === 'lg' || breakpoint === 'xl' || breakpoint === '2xl',
  };
}