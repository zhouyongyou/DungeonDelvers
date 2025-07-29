// src/hooks/useNftDisplayPreference.ts
// 管理用戶的 NFT 顯示偏好（SVG vs PNG）

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export type NftDisplayMode = 'svg' | 'png';

const STORAGE_KEY = 'nft-display-preference';

export const useNftDisplayPreference = () => {
  // 從 localStorage 讀取偏好設置，默認使用 SVG
  const [displayMode, setDisplayMode] = useState<NftDisplayMode>(() => {
    if (typeof window === 'undefined') return 'svg';
    
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return (saved === 'png' || saved === 'svg') ? saved : 'svg';
    } catch {
      return 'svg';
    }
  });

  // 保存偏好設置到 localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, displayMode);
    } catch (error) {
      console.warn('Failed to save NFT display preference:', error);
    }
  }, [displayMode]);

  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'svg' ? 'png' : 'svg');
  };

  const setToSvg = () => setDisplayMode('svg');
  const setToPng = () => setDisplayMode('png');

  return {
    displayMode,
    setDisplayMode,
    toggleDisplayMode,
    setToSvg,
    setToPng,
    isSvgMode: displayMode === 'svg',
    isPngMode: displayMode === 'png'
  };
};

// 全局狀態管理（使用 Context）

interface NftDisplayContextType {
  displayMode: NftDisplayMode;
  toggleDisplayMode: () => void;
  setDisplayMode: (mode: NftDisplayMode) => void;
}

const NftDisplayContext = createContext<NftDisplayContextType | null>(null);

export const NftDisplayProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const preference = useNftDisplayPreference();
  
  return (
    <NftDisplayContext.Provider value={{
      displayMode: preference.displayMode,
      toggleDisplayMode: preference.toggleDisplayMode,
      setDisplayMode: preference.setDisplayMode
    }}>
      {children}
    </NftDisplayContext.Provider>
  );
};

export const useNftDisplay = () => {
  const context = useContext(NftDisplayContext);
  if (!context) {
    throw new Error('useNftDisplay must be used within NftDisplayProvider');
  }
  return context;
};