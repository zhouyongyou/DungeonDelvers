// src/hooks/useNftDisplayMode.ts - NFT 顯示模式管理

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type DisplayMode = 'png' | 'svg' | 'auto';

interface NftDisplayModeState {
    displayMode: DisplayMode;
    setDisplayMode: (mode: DisplayMode) => void;
    // Auto mode: 根據性能和設備自動選擇
    shouldUseSvg: () => boolean;
}

export const useNftDisplayMode = create<NftDisplayModeState>()(
    persist(
        (set, get) => ({
            displayMode: 'png',
            
            setDisplayMode: (mode) => set({ displayMode: mode }),
            
            shouldUseSvg: () => {
                const mode = get().displayMode;
                
                if (mode === 'svg') return true;
                if (mode === 'png') return false;
                
                // Auto mode 邏輯
                // 1. 檢查是否支援 SVG
                const supportsSvg = document.implementation.hasFeature('http://www.w3.org/TR/SVG11/feature#Image', '1.1');
                if (!supportsSvg) return false;
                
                // 2. 檢查設備性能（簡單判斷）
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                const isLowEndDevice = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
                
                // 3. 如果是低端設備或移動設備，使用 PNG
                if (isMobile || isLowEndDevice) return false;
                
                // 4. 否則使用 SVG
                return true;
            }
        }),
        {
            name: 'nft-display-mode'
        }
    )
);