# Dungeon Delvers 語言系統實施範例

## 🚀 快速開始指南

### 1. 安裝依賴
```bash
npm install react-i18next i18next i18next-browser-languagedetector i18next-http-backend
```

### 2. 基礎配置文件

#### `src/i18n/index.ts`
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'zh-TW',
    supportedLngs: ['zh-TW', 'en', 'ja', 'ko'],
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
    
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;
```

### 3. 語言文件結構

#### `public/locales/zh-TW/common.json`
```json
{
  "buttons": {
    "connect": "連接錢包",
    "disconnect": "斷開連接",
    "confirm": "確認",
    "cancel": "取消",
    "save": "儲存",
    "loading": "載入中...",
    "retry": "重試"
  },
  "messages": {
    "connectWallet": "要使用此功能，請先連接您的錢包。",
    "loadingResources": "正在載入頁面資源...",
    "transactionPending": "交易處理中...",
    "transactionSuccess": "交易成功！",
    "transactionFailed": "交易失敗，請重試"
  },
  "theme": {
    "light": "淺色模式",
    "dark": "深色模式",
    "system": "系統"
  }
}
```

#### `public/locales/zh-TW/navigation.json`
```json
{
  "menu": {
    "dashboard": "儀表板",
    "profile": "個人檔案",
    "mint": "鑄造",
    "party": "隊伍",
    "dungeon": "地下城",
    "altar": "升星祭壇",
    "codex": "圖鑑",
    "vip": "VIP",
    "referral": "邀請",
    "explorer": "數據查詢",
    "admin": "管理後台"
  },
  "subtitle": "你的奇幻冒險由此開始"
}
```

#### `public/locales/en/common.json`
```json
{
  "buttons": {
    "connect": "Connect Wallet",
    "disconnect": "Disconnect",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "save": "Save",
    "loading": "Loading...",
    "retry": "Retry"
  },
  "messages": {
    "connectWallet": "Please connect your wallet to use this feature.",
    "loadingResources": "Loading page resources...",
    "transactionPending": "Transaction pending...",
    "transactionSuccess": "Transaction successful!",
    "transactionFailed": "Transaction failed, please try again"
  },
  "theme": {
    "light": "Light",
    "dark": "Dark", 
    "system": "System"
  }
}
```

#### `public/locales/en/navigation.json`
```json
{
  "menu": {
    "dashboard": "Dashboard",
    "profile": "Profile",
    "mint": "Mint",
    "party": "Party",
    "dungeon": "Dungeon",
    "altar": "Altar",
    "codex": "Codex",
    "vip": "VIP",
    "referral": "Referral",
    "explorer": "Explorer",
    "admin": "Admin"
  },
  "subtitle": "Your Fantasy Adventure Begins Here"
}
```

### 4. 語言切換器組件

#### `src/components/ui/LanguageSelector.tsx`
```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'zh-TW', name: '繁體中文', flag: '🇹🇼' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

export const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-full text-gray-300 hover:bg-white/20 transition-colors"
        aria-label="Select language"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="hidden sm:inline text-sm">{currentLanguage.name}</span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1F1D36] rounded-lg shadow-lg border border-gray-600 z-50">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/10 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                currentLanguage.code === language.code ? 'bg-white/20' : ''
              }`}
            >
              <span className="text-lg">{language.flag}</span>
              <span className="text-sm text-gray-300">{language.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 5. 修改現有組件

#### 修改 `src/main.tsx`
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n'; // 添加這行

// ... 其他代碼保持不變
```

#### 修改 `src/components/layout/Header.tsx`
```typescript
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next'; // 新增
import { LanguageSelector } from '../ui/LanguageSelector'; // 新增
// ... 其他 imports

export const Header: React.FC<{ activePage: Page; setActivePage: (page: Page) => void }> = ({ activePage, setActivePage }) => {
  const { t } = useTranslation(['common', 'navigation']); // 新增
  // ... 其他代碼

  const navItems: { key: Page; label: string }[] = useMemo(() => {
      const items: { key: Page; label: string }[] = [
          { key: 'dashboard', label: t('navigation:menu.dashboard') },
          { key: 'profile', label: t('navigation:menu.profile') },
          { key: 'mint', label: t('navigation:menu.mint') },
          { key: 'party', label: t('navigation:menu.party') },
          { key: 'dungeon', label: t('navigation:menu.dungeon') },
          { key: 'altar', label: t('navigation:menu.altar') },
          { key: 'codex', label: t('navigation:menu.codex') },
          { key: 'vip', label: t('navigation:menu.vip') },
          { key: 'referral', label: t('navigation:menu.referral') },
          { key: 'explorer', label: t('navigation:menu.explorer') },
      ];
      if (isDeveloper) {
          items.push({ key: 'admin', label: t('navigation:menu.admin') });
      }
      return items;
  }, [isDeveloper, t]);

  return (
    <header className="bg-[#1F1D36] shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2 md:space-x-4">
                    <img src={logoUrl} alt="Dungeon Delvers Logo" className="h-10 w-10 md:h-12 md:w-12 rounded-full border-2 border-[#C0A573]"/>
                    <div>
                        <h1 className="text-xl md:text-3xl font-bold text-white text-shadow-gold">Dungeon Delvers</h1>
                        <div className="hidden md:flex text-xs text-gray-300 dark:text-gray-400 items-center gap-2">
                           {isConnected && level && (
                                <span className="font-bold text-yellow-400 bg-black/20 px-2 py-0.5 rounded">LV {level}</span>
                           )}
                           <span>{t('navigation:subtitle')}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 md:gap-2">
                    <LanguageSelector /> {/* 新增語言選擇器 */}
                    <ThemeToggleButton />
                    {/* ... 其他按鈕 */}
                    <ActionButton onClick={handleConnectClick} isLoading={isConnecting} disabled={isConnecting} className="px-3 py-2 md:px-4 rounded-full text-sm w-32 md:w-36">
                      {isConnected && address ? `${address.substring(0, 4)}...${address.substring(address.length - 4)}` : t('common:buttons.connect')}
                    </ActionButton>
                    {/* ... 其他代碼 */}
                </div>
            </div>
            {/* ... 其他代碼 */}
        </div>
    </header>
  );
};
```

### 6. 在其他組件中使用翻譯

#### 修改 `src/App.tsx`
```typescript
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next'; // 新增
// ... 其他 imports

const PageLoader: React.FC = () => {
    const { t } = useTranslation('common'); // 新增
    
    return (
        <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center gap-4">
                <LoadingSpinner size="h-10 w-10" color="border-indigo-500" />
                <p className="text-lg text-gray-500 dark:text-gray-400">
                    {t('messages.loadingResources')}
                </p>
            </div>
        </div>
    );
};

function App() {
  const { t } = useTranslation('common'); // 新增
  // ... 其他代碼

  const renderPage = () => {
    const pageRequiresWallet: Page[] = ['dashboard', 'mint', 'party', 'dungeon', 'admin', 'altar', 'profile', 'vip', 'referral', 'codex'];
    
    if (!isConnected && pageRequiresWallet.includes(activePage)) {
        return (
            <div className="mt-10">
                <EmptyState message={t('messages.connectWallet')} />
            </div>
        );
    }
      
    // ... 其他代碼
  };

  // ... 其他代碼
}
```

### 7. 類型定義

#### `src/types/i18n.ts`
```typescript
export interface TranslationResources {
  common: {
    buttons: {
      connect: string;
      disconnect: string;
      confirm: string;
      cancel: string;
      save: string;
      loading: string;
      retry: string;
    };
    messages: {
      connectWallet: string;
      loadingResources: string;
      transactionPending: string;
      transactionSuccess: string;
      transactionFailed: string;
    };
    theme: {
      light: string;
      dark: string;
      system: string;
    };
  };
  navigation: {
    menu: {
      dashboard: string;
      profile: string;
      mint: string;
      party: string;
      dungeon: string;
      altar: string;
      codex: string;
      vip: string;
      referral: string;
      explorer: string;
      admin: string;
    };
    subtitle: string;
  };
}

declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: TranslationResources;
  }
}
```

## 🎯 實施步驟

### 第一步：基礎設置
1. 安裝依賴包
2. 創建 i18n 配置
3. 創建基礎語言文件 (zh-TW, en)

### 第二步：核心組件改造
1. 修改 Header 組件
2. 添加語言選擇器
3. 修改 App.tsx 主要文字

### 第三步：逐步遷移
1. 按頁面逐步遷移文字
2. 添加更多語言支持
3. 優化翻譯質量

### 第四步：測試與優化
1. 測試各語言切換
2. 檢查文字顯示
3. 優化響應式設計

## 📝 使用範例

```typescript
// 基礎使用
const { t } = useTranslation('common');
const buttonText = t('buttons.connect');

// 帶參數
const { t } = useTranslation('common');
const message = t('messages.welcome', { name: 'Alice' });

// 多命名空間
const { t } = useTranslation(['common', 'navigation']);
const menuLabel = t('navigation:menu.dashboard');
```

這個實施方案可以讓您快速開始國際化改造，建議先完成基礎設置，然後逐步遷移現有文字。