import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';

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

// Route configuration
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/mint',
    element: <MintPage />,
  },
  {
    path: '/dungeon',
    element: <DungeonPage />,
  },
  {
    path: '/altar',
    element: <AltarPage />,
  },
  {
    path: '/my-assets',
    element: <MyAssetsPage />,
  },
  {
    path: '/provisions',
    element: <ProvisionsPage />,
  },
  {
    path: '/profile',
    element: <ProfilePage />,
  },
  {
    path: '/vip',
    element: <VipPage />,
  },
  {
    path: '/referral',
    element: <ReferralPage />,
  },
  {
    path: '/admin',
    element: <AdminPage />,
  },
  {
    path: '/codex',
    element: <CodexPage />,
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]; 