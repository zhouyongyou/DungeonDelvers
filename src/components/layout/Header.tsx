// src/components/layout/Header.tsx

import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useTranslation } from 'react-i18next';
import { Disclosure } from '@headlessui/react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { LanguageSelector } from '../ui/LanguageSelector';

const navigation = [
  { name: 'nav.dashboard', href: '/dashboard' },
  { name: 'nav.mint', href: '/mint' },
  { name: 'nav.dungeon', href: '/dungeon' },
  { name: 'nav.altar', href: '/altar' },
  { name: 'nav.my_assets', href: '/my-assets' },
  { name: 'nav.provisions', href: '/provisions' },
  { name: 'nav.profile', href: '/profile' },
  { name: 'nav.vip', href: '/vip' },
  { name: 'nav.referral', href: '/referral' },
  { name: 'nav.codex', href: '/codex' },
];

export function Header() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <Disclosure as="nav" className="bg-bg-secondary/50 backdrop-blur-sm border-b border-white/10">
      {({ open }) => (
        <>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between">
              <div className="flex">
                <div className="flex flex-shrink-0 items-center">
                  <Link to="/" className="text-2xl font-bold text-text-primary">
                    Dungeon Delvers
                  </Link>
                </div>
                <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
                  {navigation.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={clsx(
                        'inline-flex items-center px-3 py-2 text-sm font-medium transition-colors',
                        location.pathname === item.href
                          ? 'text-text-primary border-b-2 border-primary'
                          : 'text-text-secondary hover:text-text-primary hover:border-b-2 hover:border-primary/50'
                      )}
                    >
                      {t(item.name)}
                    </Link>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center">
                <div className="hidden sm:ml-6 sm:flex sm:items-center gap-4">
                  <LanguageSelector />
                  <ConnectButton />
                </div>
                <div className="flex items-center sm:hidden">
                  <Disclosure.Button className="inline-flex items-center justify-center rounded-md p-2 text-text-secondary hover:bg-bg-accent hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary">
                    <span className="sr-only">Open main menu</span>
                    {open ? (
                      <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                    ) : (
                      <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                    )}
                  </Disclosure.Button>
                </div>
              </div>
            </div>
          </div>

          <Disclosure.Panel className="sm:hidden">
            <div className="space-y-1 px-2 pb-3 pt-2">
              {navigation.map((item) => (
                <Disclosure.Button
                  key={item.href}
                  as={Link}
                  to={item.href}
                  className={clsx(
                    'block px-3 py-2 text-base font-medium rounded-md',
                    location.pathname === item.href
                      ? 'bg-primary/10 text-text-primary'
                      : 'text-text-secondary hover:bg-bg-accent hover:text-text-primary'
                  )}
                >
                  {t(item.name)}
                </Disclosure.Button>
              ))}
            </div>
            <div className="border-t border-white/10 pb-3 pt-4">
              <div className="px-4 space-y-3">
                <LanguageSelector />
                <ConnectButton />
              </div>
            </div>
          </Disclosure.Panel>
        </>
      )}
    </Disclosure>
  );
}
