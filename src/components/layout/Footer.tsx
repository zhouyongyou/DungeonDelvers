// src/components/layout/Footer.tsx

import { useTranslation } from 'react-i18next';
import { useNetwork } from 'wagmi';

export function Footer() {
  const { t } = useTranslation();
  const { chain } = useNetwork();

  return (
    <footer className="bg-bg-secondary/50 backdrop-blur-sm border-t border-white/10">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm text-text-secondary">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            {chain && (
              <div className="text-sm text-text-secondary">
                {t('footer.network')}: <span className="text-text-primary">{chain.name}</span>
              </div>
            )}
            <div className="text-sm text-text-secondary">
              {t('footer.version')}: <span className="text-text-primary">v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
