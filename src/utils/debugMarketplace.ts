// Debug helper for marketplace issues

export const debugMarketplace = () => {
  console.log('=== Marketplace Debug Info ===');
  
  // Check if modules are loaded
  try {
    console.log('Checking imports...');
    
    // Check config
    const configModule = require('../config/marketplace');
    console.log('✅ marketplace config loaded:', configModule);
    
    // Check hooks
    const hooksModule = require('../hooks/useMarketplaceV2Contract');
    console.log('✅ useMarketplaceV2Contract loaded:', hooksModule);
    
    // Check for circular dependencies
    console.log('Checking for circular dependencies...');
    
  } catch (error) {
    console.error('❌ Module loading error:', error);
  }
  
  // Check window errors
  const errorHandler = (event: ErrorEvent) => {
    console.error('Window error caught:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    });
  };
  
  window.addEventListener('error', errorHandler);
  
  return () => {
    window.removeEventListener('error', errorHandler);
  };
};

// Auto-run in development
if (import.meta.env.DEV) {
  debugMarketplace();
}