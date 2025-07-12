import React, { useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { ExpeditionContext, type ExpeditionState } from './ExpeditionContextTypes';

interface ExpeditionProviderProps {
  children: ReactNode;
}

export const ExpeditionProvider: React.FC<ExpeditionProviderProps> = ({ children }) => {
  const [expeditionState, setExpeditionState] = useState<ExpeditionState>({
    isExpeditionActive: false,
    currentPartyId: null,
    currentDungeonId: null,
    expeditionStartTime: null,
    expeditionDuration: null,
  });

  const startExpedition = useCallback((partyId: number, dungeonId: number, duration: number) => {
    setExpeditionState({
      isExpeditionActive: true,
      currentPartyId: partyId,
      currentDungeonId: dungeonId,
      expeditionStartTime: Date.now(),
      expeditionDuration: duration,
    });
  }, []);

  const endExpedition = useCallback(() => {
    setExpeditionState({
      isExpeditionActive: false,
      currentPartyId: null,
      currentDungeonId: null,
      expeditionStartTime: null,
      expeditionDuration: null,
    });
  }, []);

  const updateExpeditionProgress = useCallback((progress: Partial<ExpeditionState>) => {
    setExpeditionState(prev => ({ ...prev, ...progress }));
  }, []);

  return (
    <ExpeditionContext.Provider value={{
      expeditionState,
      startExpedition,
      endExpedition,
      updateExpeditionProgress,
    }}>
      {children}
    </ExpeditionContext.Provider>
  );
}; 