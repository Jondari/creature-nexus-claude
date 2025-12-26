import { GameState, GameAction } from './game';

export type MatchmakingStatus =
  | 'idle'
  | 'searching'
  | 'found'
  | 'matched'
  | 'in_game'
  | 'completed'
  | 'cancelled'
  | 'error';

export type PvPGameStatus =
  | 'waiting_for_players'
  | 'ready'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'abandoned';

export type InvitationStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'cancelled';

export interface MatchmakingPlayer {
  userId: string;
  userName: string;
  deckId: string;
  elo?: number;
  enteredAt: number; // Timestamp
}

export interface MatchmakingQueue {
  id: string;
  player: MatchmakingPlayer;
  status: MatchmakingStatus;
  createdAt: number;
  updatedAt: number;
  matchId?: string; // Set when matched
}

export interface PvPMatch {
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  player1DeckId: string;
  player2DeckId: string;
  status: PvPGameStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  winnerId?: string;
  currentTurn: number;
  currentPlayerId: string;
  lastActivityAt: number; // For timeout detection
  gameState?: GameState; // Synced game state
  actionHistory: PvPGameAction[]; // All actions in order
}

export interface PvPGameAction extends GameAction {
  actionId: string;
  matchId: string;
  timestamp: number;
  acknowledged: boolean; // Whether opponent has seen this action
}

export interface PvPInvitation {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  deckId: string;
  status: InvitationStatus;
  createdAt: number;
  expiresAt: number;
  matchId?: string; // Set when accepted
}

export interface PvPPlayerState {
  userId: string;
  isConnected: boolean;
  lastHeartbeat: number;
  isReady: boolean;
  hasForfeited: boolean;
}

export interface PvPMatchResult {
  matchId: string;
  winnerId: string;
  winnerName: string;
  loserId: string;
  loserName: string;
  winReason: 'points' | 'deck_out' | 'forfeit' | 'timeout' | 'disconnect';
  duration: number; // in seconds
  totalTurns: number;
  timestamp: number;
}

export interface PvPStats {
  userId: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  elo: number;
  currentStreak: number; // positive for wins, negative for losses
  longestWinStreak: number;
  totalPlayTime: number; // in seconds
  lastMatchAt?: number;
}

export interface PvPLobbyState {
  isSearching: boolean;
  currentMatch?: PvPMatch;
  activeInvitations: PvPInvitation[];
  sentInvitations: PvPInvitation[];
  stats?: PvPStats;
  error?: string;
}

// Constants
export const PVP_CONSTANTS = {
  MATCHMAKING_TIMEOUT: 120000, // 2 minutes
  TURN_TIMEOUT: 90000, // 90 seconds per turn
  INVITATION_TIMEOUT: 300000, // 5 minutes
  HEARTBEAT_INTERVAL: 5000, // 5 seconds
  DISCONNECT_THRESHOLD: 15000, // 15 seconds without heartbeat = disconnect
  MAX_ELO_DIFFERENCE: 300, // Max ELO difference for matchmaking
  INITIAL_ELO: 1200,
  ELO_K_FACTOR: 32, // Elo rating K-factor
} as const;
