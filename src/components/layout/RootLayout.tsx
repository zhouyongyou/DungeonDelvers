import { Outlet } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useTranslation } from 'react-i18next';

import { Header } from './Header';
import { Footer } from './Footer';
import { WrongNetworkBanner } from '../ui/WrongNetworkBanner';
import { TransactionWatcher } from '../core/TransactionWatcher';

export function RootLayout() {
  const { isConnected } = useAccount();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col gradient-bg text-text-primary">
      <Header />
      <WrongNetworkBanner />
      
      <main className="flex-grow container mx-auto px-4 py-8 md:px-6 md:py-12">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-8">
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-text-primary">
                {t('common.welcome')}
              </h1>
              <p className="text-xl text-text-secondary">
                {t('common.connect_wallet_to_continue')}
              </p>
            </div>
            <ConnectButton />
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      <Footer />
      <TransactionWatcher />
    </div>
  );
} 