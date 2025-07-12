import { createContext } from 'react';

export interface ExpeditionState {
  isExpeditionActive: boolean;
  currentPartyId: number | null;
  currentDungeonId: number | null;
  expeditionStartTime: number | null;
  expeditionDuration: number | null;
}

export interface ExpeditionContextType {
  expeditionState: ExpeditionState;
  startExpedition: (partyId: number, dungeonId: number, duration: number) => void;
  endExpedition: () => void;
  updateExpeditionProgress: (progress: Partial<ExpeditionState>) => void;
}

export const ExpeditionContext = createContext<ExpeditionContextType | undefined>(undefined); 