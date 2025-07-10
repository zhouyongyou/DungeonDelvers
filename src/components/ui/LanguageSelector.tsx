import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'zh-TW', name: 'Traditional Chinese', nativeName: '繁體中文', flag: '🇹🇼' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
];

export const LanguageSelector: React.FC = () => {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const handleLanguageChange = (languageCode: string) => {
    i18n.changeLanguage(languageCode);
    setIsOpen(false);
    
    // 顯示語言切換成功訊息
    const selectedLanguage = languages.find(lang => lang.code === languageCode);
    if (selectedLanguage) {
      // 這裡可以添加 toast 通知（如果有的話）
      console.log(`Language switched to ${selectedLanguage.nativeName}`);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-full text-gray-300 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
        aria-label={t('navigation:languageSelector')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="text-lg" role="img" aria-label={currentLanguage.name}>
          {currentLanguage.flag}
        </span>
        <span className="hidden sm:inline text-sm font-medium">
          {currentLanguage.nativeName}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* 背景遮罩 (移動端) */}
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setIsOpen(false)} />
          
          {/* 下拉選單 */}
          <div 
            className="absolute right-0 mt-2 w-56 bg-[#1F1D36] rounded-lg shadow-lg border border-gray-600 z-50 animate-zoom-in"
            role="listbox"
            aria-label={t('navigation:languageSelector')}
          >
            <div className="py-1">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors focus:outline-none focus:bg-white/20 ${
                    currentLanguage.code === language.code 
                      ? 'bg-white/20 border-l-4 border-[#C0A573]' 
                      : ''
                  }`}
                  role="option"
                  aria-selected={currentLanguage.code === language.code}
                >
                  <span className="text-xl" role="img" aria-label={language.name}>
                    {language.flag}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-200">
                      {language.nativeName}
                    </span>
                    <span className="text-xs text-gray-400">
                      {language.name}
                    </span>
                  </div>
                  {currentLanguage.code === language.code && (
                    <div className="ml-auto">
                      <svg className="w-4 h-4 text-[#C0A573]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};