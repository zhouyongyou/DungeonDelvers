// Z-Index Configuration
// Centralized z-index management to prevent overlay conflicts

export const Z_INDEX = {
  // Base layers
  BASE: 1,
  CONTENT: 10,
  
  // Navigation and UI
  HEADER: 100,
  DROPDOWN: 200,
  SIDEBAR: 300,
  
  // Overlays
  TOOLTIP: 400,
  POPOVER: 500,
  
  // Modals and Dialogs
  MODAL_BACKDROP: 9999,
  MODAL_CONTENT: 10000,
  
  // Tutorial and Onboarding
  TUTORIAL_BACKDROP: 10100,
  TUTORIAL_CONTENT: 10200,
  
  // Alerts and Notifications
  TOAST: 10300,
  ALERT: 10400,
  
  // Critical system messages
  SYSTEM_ALERT: 10500,
  
  // Development/Debug overlays
  DEBUG: 99999
} as const;

export type ZIndexKey = keyof typeof Z_INDEX;

// Helper function to get z-index value
export const getZIndex = (key: ZIndexKey): number => Z_INDEX[key];

// Helper function to create inline style with z-index
export const createZIndexStyle = (key: ZIndexKey): React.CSSProperties => ({
  zIndex: Z_INDEX[key]
});