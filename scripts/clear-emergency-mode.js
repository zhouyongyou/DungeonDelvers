// Clear emergency RPC mode from localStorage
const clearEmergencyMode = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('emergency-rpc-mode');
    console.log('✅ Emergency RPC mode cleared');
    console.log('🔄 Please refresh the page to apply changes');
    return true;
  }
  console.log('❌ Cannot access localStorage');
  return false;
};

// Execute if running in browser
if (typeof window !== 'undefined') {
  clearEmergencyMode();
} else {
  console.log('This script must be run in the browser console');
}

export default clearEmergencyMode;