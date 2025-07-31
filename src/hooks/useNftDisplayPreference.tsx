// src/hooks/useNftDisplayPreference.ts
// 管理用戶的 NFT 顯示偏好（SVG vs PNG）

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

export type NftDisplayMode = 'svg' | 'png';

const STORAGE_KEY = 'nft-display-preference';

export const useNftDisplayPreference = () => {
  // 強制使用 PNG，不再從 localStorage 讀取
  const [displayMode, setDisplayMode] = useState<NftDisplayMode>('png');

  // 清理舊的 localStorage 設定
  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // 忽略錯誤
    }
  }, []);

  const toggleDisplayMode = () => {
    // 移除切換功能
    console.log('PNG/SVG 切換已禁用，統一使用 PNG');
  };

  const setToSvg = () => console.log('SVG 模式已禁用，統一使用 PNG');
  const setToPng = () => {}; // 已經是 PNG，不做任何事

  return {
    displayMode,
    setDisplayMode,
    toggleDisplayMode,
    setToSvg,
    setToPng,
    isSvgMode: false, // 始終不是 SVG
    isPngMode: true   // 始終是 PNG
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