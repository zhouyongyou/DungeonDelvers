import { useContext } from 'react';
import { ExpeditionContext } from '../contexts/ExpeditionContextTypes';

export const useExpedition = () => {
  const context = useContext(ExpeditionContext);
  if (!context) {
    throw new Error('useExpedition must be used within an ExpeditionProvider');
  }
  return context;
}; 