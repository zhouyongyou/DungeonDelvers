// src/components/ui/PageTransition.tsx

import React, { useEffect, useState, useRef } from 'react';

interface PageTransitionProps {
    children: React.ReactNode;
    pageKey: string;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ children, pageKey }) => {
    const [isVisible, setIsVisible] = useState(false);
    const prevKeyRef = useRef(pageKey);
    
    useEffect(() => {
        // 頁面切換時的動畫效果
        if (prevKeyRef.current !== pageKey) {
            setIsVisible(false);
            const timer = setTimeout(() => {
                setIsVisible(true);
                prevKeyRef.current = pageKey;
            }, 150);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(true);
        }
    }, [pageKey]);
    
    return (
        <div 
            className={`w-full transition-all duration-300 ease-out ${
                isVisible 
                    ? 'opacity-100 transform translate-y-0' 
                    : 'opacity-0 transform translate-y-4'
            }`}
        >
            {children}
        </div>
    );
};

// 預載入鉤子
export const usePagePreload = () => {
    const [preloadedPages, setPreloadedPages] = useState<Set<string>>(new Set());
    
    const preloadPage = (pageName: string) => {
        if (!preloadedPages.has(pageName)) {
            // 動態導入頁面組件
            switch (pageName) {
                case 'overview':
                    import('../../pages/OverviewPage');
                    break;
                case 'myAssets':
                    import('../../pages/MyAssetsPageEnhanced');
                    break;
                case 'mint':
                    import('../../pages/MintPage');
                    break;
                case 'altar':
                    import('../../pages/AltarPage');
                    break;
                case 'dungeon':
                    import('../../pages/DungeonPage');
                    break;
                case 'vip':
                    import('../../pages/VipPage');
                    break;
                case 'referral':
                    import('../../pages/ReferralPage');
                    break;
            }
            setPreloadedPages(prev => new Set([...prev, pageName]));
        }
    };
    
    return { preloadPage, preloadedPages };
};