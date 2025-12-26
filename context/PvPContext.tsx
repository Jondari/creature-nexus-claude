import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import {
  PvPLobbyState,
  PvPMatch,
  PvPInvitation,
  PvPStats,
  MatchmakingStatus,
  PvPGameAction,
} from '../types/pvp';
import { GameState } from '../types/game';
import pvpMatchmakingService from '../services/pvpMatchmakingService';
import { useAuth } from './AuthContext';

interface PvPContextState extends PvPLobbyState {
  matchmakingStatus: MatchmakingStatus;
  queueId?: string;
  isInMatch: boolean;
  currentGameState?: GameState;
}

interface PvPContextActions {
  // Matchmaking
  joinMatchmaking: (deckId: string) => Promise<void>;
  leaveMatchmaking: () => Promise<void>;

  // Invitations
  sendInvitation: (toUserId: string, toUserName: string, deckId: string) => Promise<void>;
  acceptInvitation: (invitationId: string, deckId: string) => Promise<void>;
  declineInvitation: (invitationId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;

  // Match
  setCurrentMatch: (match: PvPMatch | undefined) => void;
  updateGameState: (gameState: GameState) => void;
  clearMatch: () => void;

  // Stats
  refreshStats: () => Promise<void>;

  // General
  resetPvP: () => void;
}

type PvPContextType = PvPContextState & PvPContextActions;

const PvPContext = createContext<PvPContextType | undefined>(undefined);

type PvPAction =
  | { type: 'SET_MATCHMAKING_STATUS'; payload: MatchmakingStatus }
  | { type: 'SET_QUEUE_ID'; payload: string | undefined }
  | { type: 'SET_CURRENT_MATCH'; payload: PvPMatch | undefined }
  | { type: 'SET_INVITATIONS'; payload: PvPInvitation[] }
  | { type: 'SET_SENT_INVITATIONS'; payload: PvPInvitation[] }
  | { type: 'SET_STATS'; payload: PvPStats | undefined }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'SET_SEARCHING'; payload: boolean }
  | { type: 'SET_GAME_STATE'; payload: GameState | undefined }
  | { type: 'RESET' };

const initialState: PvPContextState = {
  matchmakingStatus: 'idle',
  isSearching: false,
  isInMatch: false,
  activeInvitations: [],
  sentInvitations: [],
};

function pvpReducer(state: PvPContextState, action: PvPAction): PvPContextState {
  switch (action.type) {
    case 'SET_MATCHMAKING_STATUS':
      return {
        ...state,
        matchmakingStatus: action.payload,
        isInMatch: action.payload === 'matched' || action.payload === 'in_game',
      };
    case 'SET_QUEUE_ID':
      return {
        ...state,
        queueId: action.payload,
      };
    case 'SET_CURRENT_MATCH':
      return {
        ...state,
        currentMatch: action.payload,
        isInMatch: !!action.payload,
      };
    case 'SET_INVITATIONS':
      return {
        ...state,
        activeInvitations: action.payload,
      };
    case 'SET_SENT_INVITATIONS':
      return {
        ...state,
        sentInvitations: action.payload,
      };
    case 'SET_STATS':
      return {
        ...state,
        stats: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_SEARCHING':
      return {
        ...state,
        isSearching: action.payload,
      };
    case 'SET_GAME_STATE':
      return {
        ...state,
        currentGameState: action.payload,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface PvPProviderProps {
  children: ReactNode;
}

export function PvPProvider({ children }: PvPProviderProps) {
  const [state, dispatch] = useReducer(pvpReducer, initialState);
  const { user } = useAuth();

  // Subscribe to invitations
  useEffect(() => {
    if (!user) return;

    const unsubscribe = pvpMatchmakingService.subscribeToInvitations((invitations) => {
      dispatch({ type: 'SET_INVITATIONS', payload: invitations });
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  // Load player stats on mount
  useEffect(() => {
    if (user) {
      refreshStats();
    }
  }, [user]);

  // Matchmaking functions
  const joinMatchmaking = async (deckId: string) => {
    try {
      dispatch({ type: 'SET_SEARCHING', payload: true });
      dispatch({ type: 'SET_MATCHMAKING_STATUS', payload: 'searching' });
      dispatch({ type: 'SET_ERROR', payload: undefined });

      const userName = user?.displayName || user?.email || 'Anonymous';
      const queueId = await pvpMatchmakingService.joinQueue(userName, deckId);

      dispatch({ type: 'SET_QUEUE_ID', payload: queueId });

      // Subscribe to queue updates
      const unsubscribe = pvpMatchmakingService.subscribeToQueue(queueId, (queue) => {
        if (!queue) {
          dispatch({ type: 'SET_MATCHMAKING_STATUS', payload: 'cancelled' });
          dispatch({ type: 'SET_SEARCHING', payload: false });
          return;
        }

        dispatch({ type: 'SET_MATCHMAKING_STATUS', payload: queue.status });

        if (queue.status === 'matched' && queue.matchId) {
          dispatch({ type: 'SET_SEARCHING', payload: false });
          // Match found - the app should navigate to the game screen
          // and load the match data
        }
      });

      // Auto-cleanup subscription after 2 minutes
      setTimeout(() => {
        unsubscribe();
      }, 120000);
    } catch (error) {
      console.error('Error joining matchmaking:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to join matchmaking' });
      dispatch({ type: 'SET_SEARCHING', payload: false });
      dispatch({ type: 'SET_MATCHMAKING_STATUS', payload: 'error' });
    }
  };

  const leaveMatchmaking = async () => {
    try {
      if (state.queueId) {
        await pvpMatchmakingService.leaveQueue(state.queueId);
      }
      dispatch({ type: 'SET_SEARCHING', payload: false });
      dispatch({ type: 'SET_MATCHMAKING_STATUS', payload: 'cancelled' });
      dispatch({ type: 'SET_QUEUE_ID', payload: undefined });
    } catch (error) {
      console.error('Error leaving matchmaking:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to leave matchmaking' });
    }
  };

  // Invitation functions
  const sendInvitation = async (toUserId: string, toUserName: string, deckId: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: undefined });
      await pvpMatchmakingService.sendInvitation(toUserId, toUserName, deckId);

      // Refresh sent invitations
      const sentInvites = await pvpMatchmakingService.getSentInvitations();
      dispatch({ type: 'SET_SENT_INVITATIONS', payload: sentInvites });
    } catch (error) {
      console.error('Error sending invitation:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send invitation' });
    }
  };

  const acceptInvitation = async (invitationId: string, deckId: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: undefined });
      const matchId = await pvpMatchmakingService.acceptInvitation(invitationId, deckId);

      // Match created - the app should navigate to the game screen
      // and load the match data using matchId
    } catch (error) {
      console.error('Error accepting invitation:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to accept invitation' });
    }
  };

  const declineInvitation = async (invitationId: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: undefined });
      await pvpMatchmakingService.declineInvitation(invitationId);
    } catch (error) {
      console.error('Error declining invitation:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to decline invitation' });
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: undefined });
      await pvpMatchmakingService.cancelInvitation(invitationId);

      // Refresh sent invitations
      const sentInvites = await pvpMatchmakingService.getSentInvitations();
      dispatch({ type: 'SET_SENT_INVITATIONS', payload: sentInvites });
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to cancel invitation' });
    }
  };

  // Match functions
  const setCurrentMatch = (match: PvPMatch | undefined) => {
    dispatch({ type: 'SET_CURRENT_MATCH', payload: match });
    if (match) {
      dispatch({ type: 'SET_MATCHMAKING_STATUS', payload: 'in_game' });
    }
  };

  const updateGameState = (gameState: GameState) => {
    dispatch({ type: 'SET_GAME_STATE', payload: gameState });
  };

  const clearMatch = () => {
    dispatch({ type: 'SET_CURRENT_MATCH', payload: undefined });
    dispatch({ type: 'SET_GAME_STATE', payload: undefined });
    dispatch({ type: 'SET_MATCHMAKING_STATUS', payload: 'idle' });
  };

  // Stats functions
  const refreshStats = async () => {
    try {
      if (!user?.uid) return;
      const stats = await pvpMatchmakingService.getPlayerStats(user.uid);
      dispatch({ type: 'SET_STATS', payload: stats || undefined });
    } catch (error) {
      console.error('Error refreshing stats:', error);
    }
  };

  // General functions
  const resetPvP = () => {
    dispatch({ type: 'RESET' });
  };

  const value: PvPContextType = {
    ...state,
    joinMatchmaking,
    leaveMatchmaking,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    cancelInvitation,
    setCurrentMatch,
    updateGameState,
    clearMatch,
    refreshStats,
    resetPvP,
  };

  return <PvPContext.Provider value={value}>{children}</PvPContext.Provider>;
}

export function usePvP() {
  const context = useContext(PvPContext);
  if (context === undefined) {
    throw new Error('usePvP must be used within a PvPProvider');
  }
  return context;
}
