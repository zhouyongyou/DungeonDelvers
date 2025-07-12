import { lazy, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { usePage } from '../contexts/PageContext';
import type { Page } from '../types/page';

// Lazy load components
const DashboardPage = lazy(() => import('../pages/DashboardPage'));
const MintPage = lazy(() => import('../pages/MintPage'));
const DungeonPage = lazy(() => import('../pages/DungeonPage'));
const AltarPage = lazy(() => import('../pages/AltarPage'));
const MyAssetsPage = lazy(() => import('../pages/MyAssetsPage'));
const ProvisionsPage = lazy(() => import('../pages/ProvisionsPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const VipPage = lazy(() => import('../pages/VipPage'));
const ReferralPage = lazy(() => import('../pages/ReferralPage'));
const AdminPage = lazy(() => import('../pages/AdminPage'));
const CodexPage = lazy(() => import('../pages/CodexPage'));

// Wrapper component to provide setActivePage
const PageWrapper = ({ Component, page }: { Component: React.ComponentType<any>; page: Page }) => {
  const { setActivePage } = usePage();
  
  useEffect(() => {
    setActivePage(page);
  }, [page, setActivePage]);

  return <Component setActivePage={setActivePage} />;
};

// Route configuration
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/dashboard',
    element: <PageWrapper Component={DashboardPage} page="dashboard" />,
  },
  {
    path: '/mint',
    element: <PageWrapper Component={MintPage} page="mint" />,
  },
  {
    path: '/dungeon',
    element: <PageWrapper Component={DungeonPage} page="dungeon" />,
  },
  {
    path: '/altar',
    element: <PageWrapper Component={AltarPage} page="altar" />,
  },
  {
    path: '/my-assets',
    element: <PageWrapper Component={MyAssetsPage} page="my-assets" />,
  },
  {
    path: '/provisions',
    element: <PageWrapper Component={ProvisionsPage} page="provisions" />,
  },
  {
    path: '/profile',
    element: <PageWrapper Component={ProfilePage} page="profile" />,
  },
  {
    path: '/vip',
    element: <PageWrapper Component={VipPage} page="vip" />,
  },
  {
    path: '/referral',
    element: <PageWrapper Component={ReferralPage} page="referral" />,
  },
  {
    path: '/admin',
    element: <PageWrapper Component={AdminPage} page="admin" />,
  },
  {
    path: '/codex',
    element: <PageWrapper Component={CodexPage} page="codex" />,
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]; 