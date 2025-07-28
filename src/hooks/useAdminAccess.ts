// useAdminAccess.ts - 管理員權限控制 hook
import { useAccount } from 'wagmi';
import { ENV } from '../config/env';

/**
 * 管理員權限控制 hook
 * 用於判斷當前用戶是否為管理員，控制敏感資訊的顯示
 */
export function useAdminAccess() {
  const { address } = useAccount();
  
  // 檢查是否為開發者/管理員地址
  const isAdmin = address && address.toLowerCase() === ENV.DEVELOPER.ADDRESS.toLowerCase();
  
  return {
    isAdmin: Boolean(isAdmin),
    isDeveloper: Boolean(isAdmin), // 別名，語義更清晰
    canViewSensitiveInfo: Boolean(isAdmin), // 是否可以查看敏感資訊
  };
}