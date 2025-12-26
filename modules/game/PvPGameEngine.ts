import { GameState, Player, Card, GameAction } from '../../types/game';
import { GameEngine } from './GameEngine';
import { PvPMatch, PvPGameAction, PvPPlayerState, PVP_CONSTANTS } from '../../types/pvp';
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Unsubscribe,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '../../config/firebase';

interface PvPGameEngineOptions {
  matchId: string;
  isPlayer1: boolean;
  onGameStateUpdate: (gameState: GameState) => void;
  onOpponentAction: (action: PvPGameAction) => void;
  onMatchComplete: (winnerId?: string) => void;
  onError: (error: string) => void;
}

export class PvPGameEngine {
  private matchId: string;
  private isPlayer1: boolean;
  private gameEngine?: GameEngine;
  private currentUserId: string;
  private matchUnsubscribe?: Unsubscribe;
  private heartbeatInterval?: NodeJS.Timeout;
  private timeoutCheckInterval?: NodeJS.Timeout;
  private lastProcessedActionIndex: number = -1;

  private onGameStateUpdate: (gameState: GameState) => void;
  private onOpponentAction: (action: PvPGameAction) => void;
  private onMatchComplete: (winnerId?: string) => void;
  private onError: (error: string) => void;

  constructor(options: PvPGameEngineOptions) {
    this.matchId = options.matchId;
    this.isPlayer1 = options.isPlayer1;
    this.onGameStateUpdate = options.onGameStateUpdate;
    this.onOpponentAction = options.onOpponentAction;
    this.onMatchComplete = options.onMatchComplete;
    this.onError = options.onError;

    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }
    this.currentUserId = userId;
  }

  /**
   * Initialize the game engine with match data
   */
  async initialize(
    player1: Player,
    player2: Player,
    deck1: Card[],
    deck2: Card[]
  ): Promise<void> {
    // Create local game engine
    this.gameEngine = new GameEngine(player1, player2, deck1, deck2);

    // Only player 1 initializes the game state in Firebase
    if (this.isPlayer1) {
      const initialState = this.gameEngine.getGameState();
      await this.syncGameStateToFirebase(initialState);
      await this.updateMatchStatus('ready');
    }

    // Start listening to match updates
    this.startMatchListener();

    // Start heartbeat
    this.startHeartbeat();

    // Start timeout monitoring
    this.startTimeoutMonitoring();
  }

  /**
   * Execute an action locally and sync to Firebase
   */
  async executeAction(action: GameAction): Promise<boolean> {
    if (!this.gameEngine) {
      this.onError('Game engine not initialized');
      return false;
    }

    // Verify it's current player's turn
    const currentPlayer = this.gameEngine.getCurrentPlayer();
    if (currentPlayer.id !== this.currentUserId) {
      this.onError('Not your turn');
      return false;
    }

    // Execute action locally
    const success = this.gameEngine.executeAction(action);

    if (!success) {
      return false;
    }

    // Create PvP action
    const pvpAction: PvPGameAction = {
      ...action,
      actionId: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      matchId: this.matchId,
      timestamp: Date.now(),
      acknowledged: false,
    };

    // Sync to Firebase
    try {
      await this.syncActionToFirebase(pvpAction);
      await this.syncGameStateToFirebase(this.gameEngine.getGameState());
      await this.updateLastActivity();

      // Check if game is over
      if (this.gameEngine.isGameOver()) {
        await this.handleGameOver();
      }

      return true;
    } catch (error) {
      console.error('Error syncing action to Firebase:', error);
      this.onError('Failed to sync action');
      return false;
    }
  }

  /**
   * Sync game state to Firebase
   */
  private async syncGameStateToFirebase(gameState: GameState): Promise<void> {
    const matchRef = doc(db, 'pvp_matches', this.matchId);

    // Convert Set to Array for Firebase
    const serializedState = {
      ...gameState,
      attackedThisTurn: Array.from(gameState.attackedThisTurn),
    };

    await updateDoc(matchRef, {
      gameState: serializedState,
      currentTurn: gameState.turnNumber,
      currentPlayerId: gameState.players[gameState.currentPlayerIndex].id,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Sync action to Firebase
   */
  private async syncActionToFirebase(action: PvPGameAction): Promise<void> {
    const matchRef = doc(db, 'pvp_matches', this.matchId);
    await updateDoc(matchRef, {
      actionHistory: arrayUnion(action),
    });
  }

  /**
   * Update last activity timestamp
   */
  private async updateLastActivity(): Promise<void> {
    const matchRef = doc(db, 'pvp_matches', this.matchId);
    await updateDoc(matchRef, {
      lastActivityAt: Date.now(),
    });
  }

  /**
   * Update match status
   */
  private async updateMatchStatus(status: string): Promise<void> {
    const matchRef = doc(db, 'pvp_matches', this.matchId);
    await updateDoc(matchRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  }

  /**
   * Start listening to match updates from Firebase
   */
  private startMatchListener(): void {
    const matchRef = doc(db, 'pvp_matches', this.matchId);

    this.matchUnsubscribe = onSnapshot(
      matchRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          this.onError('Match not found');
          return;
        }

        const match = snapshot.data() as PvPMatch;

        // Process new actions
        this.processNewActions(match.actionHistory);

        // Update game state if provided
        if (match.gameState) {
          this.updateLocalGameState(match.gameState);
        }

        // Check match status
        if (match.status === 'completed' || match.status === 'abandoned') {
          this.onMatchComplete(match.winnerId);
          this.cleanup();
        }
      },
      (error) => {
        console.error('Error listening to match:', error);
        this.onError('Failed to sync with server');
      }
    );
  }

  /**
   * Process new actions from opponent
   */
  private processNewActions(actions: PvPGameAction[]): void {
    if (!this.gameEngine) return;

    // Process only new actions
    const newActions = actions.slice(this.lastProcessedActionIndex + 1);

    for (const action of newActions) {
      // Skip our own actions
      if (action.playerId === this.currentUserId) {
        this.lastProcessedActionIndex++;
        continue;
      }

      // Execute opponent's action locally
      this.gameEngine.executeAction(action);
      this.onOpponentAction(action);
      this.lastProcessedActionIndex++;
    }
  }

  /**
   * Update local game state from Firebase
   */
  private updateLocalGameState(gameState: any): void {
    if (!this.gameEngine) return;

    // Deserialize Set from Array
    const deserializedState: GameState = {
      ...gameState,
      attackedThisTurn: new Set(gameState.attackedThisTurn || []),
    };

    this.onGameStateUpdate(deserializedState);
  }

  /**
   * Start heartbeat to show player is still connected
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        const playerStateRef = doc(
          db,
          'pvp_matches',
          this.matchId,
          'playerStates',
          this.currentUserId
        );

        const playerState: PvPPlayerState = {
          userId: this.currentUserId,
          isConnected: true,
          lastHeartbeat: Date.now(),
          isReady: true,
          hasForfeited: false,
        };

        await setDoc(playerStateRef, playerState);
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    }, PVP_CONSTANTS.HEARTBEAT_INTERVAL);
  }

  /**
   * Start monitoring for opponent timeout/disconnect
   */
  private startTimeoutMonitoring(): void {
    this.timeoutCheckInterval = setInterval(async () => {
      try {
        const matchDoc = await getDoc(doc(db, 'pvp_matches', this.matchId));
        if (!matchDoc.exists()) return;

        const match = matchDoc.data() as PvPMatch;
        const now = Date.now();

        // Check if opponent has timed out
        const opponentId = this.isPlayer1 ? match.player2Id : match.player1Id;
        const playerStateDoc = await getDoc(
          doc(db, 'pvp_matches', this.matchId, 'playerStates', opponentId)
        );

        if (playerStateDoc.exists()) {
          const opponentState = playerStateDoc.data() as PvPPlayerState;
          const timeSinceHeartbeat = now - opponentState.lastHeartbeat;

          // Check for disconnect
          if (timeSinceHeartbeat > PVP_CONSTANTS.DISCONNECT_THRESHOLD) {
            await this.handleOpponentDisconnect();
          }
        }

        // Check for turn timeout
        if (match.currentPlayerId !== this.currentUserId) {
          const timeSinceLastActivity = now - match.lastActivityAt;
          if (timeSinceLastActivity > PVP_CONSTANTS.TURN_TIMEOUT) {
            await this.handleTurnTimeout();
          }
        }
      } catch (error) {
        console.error('Error checking timeout:', error);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Handle opponent disconnect
   */
  private async handleOpponentDisconnect(): Promise<void> {
    await this.updateMatchStatus('abandoned');
    await updateDoc(doc(db, 'pvp_matches', this.matchId), {
      winnerId: this.currentUserId,
      completedAt: Date.now(),
    });
    this.onMatchComplete(this.currentUserId);
  }

  /**
   * Handle turn timeout
   */
  private async handleTurnTimeout(): Promise<void> {
    // Force end opponent's turn
    if (this.gameEngine) {
      const endTurnAction: GameAction = {
        type: 'END_TURN',
        playerId: this.gameEngine.getCurrentPlayer().id,
      };
      await this.executeAction(endTurnAction);
    }
  }

  /**
   * Handle game over
   */
  private async handleGameOver(): Promise<void> {
    if (!this.gameEngine) return;

    const winnerId = this.gameEngine.getWinner();
    await updateDoc(doc(db, 'pvp_matches', this.matchId), {
      status: 'completed',
      winnerId,
      completedAt: Date.now(),
    });

    this.onMatchComplete(winnerId);
  }

  /**
   * Forfeit the match
   */
  async forfeit(): Promise<void> {
    const opponentId = this.isPlayer1
      ? (await getDoc(doc(db, 'pvp_matches', this.matchId))).data()?.player2Id
      : (await getDoc(doc(db, 'pvp_matches', this.matchId))).data()?.player1Id;

    await updateDoc(doc(db, 'pvp_matches', this.matchId), {
      status: 'completed',
      winnerId: opponentId,
      completedAt: Date.now(),
    });

    // Update player state
    const playerStateRef = doc(
      db,
      'pvp_matches',
      this.matchId,
      'playerStates',
      this.currentUserId
    );
    await updateDoc(playerStateRef, {
      hasForfeited: true,
    });

    this.cleanup();
  }

  /**
   * Get current game state
   */
  getGameState(): GameState | undefined {
    return this.gameEngine?.getGameState();
  }

  /**
   * Clean up listeners and intervals
   */
  cleanup(): void {
    if (this.matchUnsubscribe) {
      this.matchUnsubscribe();
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
    }
  }
}
