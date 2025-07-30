// 域名路由工具
export const getDomainBasedRoute = (): string => {
  const hostname = window.location.hostname;
  
  // 子域名路由映射
  const domainRoutes: Record<string, string> = {
    'pitch.soulboundsaga.com': '/pitch',
    'invest.soulboundsaga.com': '/pitch',
    'pitch.dungeondelvers.xyz': '/pitch',
    'invest.dungeondelvers.xyz': '/pitch'
  };
  
  return domainRoutes[hostname] || '/dashboard';
};

// 檢查是否為 PITCH 專用域名
export const isPitchDomain = (): boolean => {
  const hostname = window.location.hostname;
  return hostname.includes('pitch.') || hostname.includes('invest.');
};

// 重定向到正確路由
export const redirectToDomainRoute = (): void => {
  const targetRoute = getDomainBasedRoute();
  const currentPath = window.location.pathname;
  
  if (currentPath !== targetRoute && isPitchDomain()) {
    window.history.replaceState({}, '', targetRoute);
  }
};