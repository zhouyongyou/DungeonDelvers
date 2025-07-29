// src/config/marketplaceConfig.ts
// Marketplace configuration for switching between localStorage and API

export interface MarketplaceConfig {
    useApi: boolean;
    apiBaseUrl?: string;
    enableDevTools: boolean;
}

const isDevelopment = process.env.NODE_ENV === 'development';

export const MARKETPLACE_CONFIG: MarketplaceConfig = {
    // Use API in production, localStorage in development (can be overridden)
    useApi: !isDevelopment,
    apiBaseUrl: isDevelopment ? '/api' : 'https://your-vercel-deployment.vercel.app/api',
    enableDevTools: isDevelopment,
};

// Allow runtime override for testing
export const setMarketplaceMode = (useApi: boolean) => {
    if (MARKETPLACE_CONFIG.enableDevTools) {
        (MARKETPLACE_CONFIG as any).useApi = useApi;
        localStorage.setItem('marketplace_use_api', useApi.toString());
    }
};

// Load saved preference in development
if (MARKETPLACE_CONFIG.enableDevTools) {
    const savedMode = localStorage.getItem('marketplace_use_api');
    if (savedMode !== null) {
        (MARKETPLACE_CONFIG as any).useApi = savedMode === 'true';
    }
}

export const getMarketplaceMode = (): boolean => MARKETPLACE_CONFIG.useApi;