// src/utils/devTools.ts - 開發工具的條件載入

import { lazy } from 'react';

// 只在開發環境載入調試頁面
export const loadDevPage = (pageName: string) => {
    if (import.meta.env.DEV) {
        switch (pageName) {
            case 'debug':
                return lazy(() => import('../pages/DebugContractPage'));
            case 'priceDebug':
                return lazy(() => import('../pages/PriceDebugPage'));
            default:
                return null;
        }
    }
    return null;
};

// 檢查是否應該顯示開發工具
export const shouldShowDevTools = () => {
    return import.meta.env.DEV || localStorage.getItem('enableDevTools') === 'true';
};

// 開發環境路由
export const devRoutes = ['debug', 'priceDebug', 'testbatch'] as const;

// 過濾掉生產環境不需要的路由
export const filterProductionRoutes = <T extends string>(routes: T[]): T[] => {
    if (import.meta.env.PROD) {
        return routes.filter(route => !devRoutes.includes(route as any));
    }
    return routes;
};