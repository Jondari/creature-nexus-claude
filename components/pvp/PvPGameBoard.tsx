import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { PvPGameEngine } from '../../modules/game/PvPGameEngine';
import { GameState, Player, Card, GameAction } from '../../types/game';
import { PvPMatch, PvPGameAction } from '../../types/pvp';
import { Battlefield } from '../board/Battlefield';
import { PlayerInfo } from '../board/PlayerInfo';
import { StatusBar } from '../board/StatusBar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { usePvP } from '../../context/PvPContext';
import { Flag, Wifi, WifiOff } from 'lucide-react-native';

interface PvPGameBoardProps {
  match: PvPMatch;
  playerDeck: Card[];
  opponentDeck: Card[];
  onMatchEnd: (winnerId?: string) => void;
}

export function PvPGameBoard({
  match,
  playerDeck,
  opponentDeck,
  onMatchEnd,
}: PvPGameBoardProps) {
  const { user } = useAuth();
  const { updateGameState } = usePvP();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [opponentAction, setOpponentAction] = useState<string | null>(null);

  const pvpEngineRef = useRef<PvPGameEngine | null>(null);

  const isPlayer1 = user?.uid === match.player1Id;
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === user?.uid;

  useEffect(() => {
    initializeGame();

    return () => {
      pvpEngineRef.current?.cleanup();
    };
  }, []);

  const initializeGame = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Create players
      const player1: Player = {
        id: match.player1Id,
        name: match.player1Name,
        deck: [],
        hand: [],
        field: [],
        energy: 0,
        points: 0,
        isAI: false,
        hasEnergyBooster: false,
      };

      const player2: Player = {
        id: match.player2Id,
        name: match.player2Name,
        deck: [],
        hand: [],
        field: [],
        energy: 0,
        points: 0,
        isAI: false,
        hasEnergyBooster: false,
      };

      // Initialize PvP game engine
      const pvpEngine = new PvPGameEngine({
        matchId: match.id,
        isPlayer1,
        onGameStateUpdate: (newGameState) => {
          setGameState(newGameState);
          updateGameState(newGameState);
        },
        onOpponentAction: (action) => {
          handleOpponentAction(action);
        },
        onMatchComplete: (winnerId) => {
          handleMatchComplete(winnerId);
        },
        onError: (errorMsg) => {
          setError(errorMsg);
          setIsConnected(false);
        },
      });

      pvpEngineRef.current = pvpEngine;

      // Initialize with decks
      await pvpEngine.initialize(
        player1,
        player2,
        isPlayer1 ? playerDeck : opponentDeck,
        isPlayer1 ? opponentDeck : playerDeck
      );

      const initialState = pvpEngine.getGameState();
      if (initialState) {
        setGameState(initialState);
      }

      setIsLoading(false);
      setIsConnected(true);
    } catch (err) {
      console.error('Error initializing game:', err);
      setError('Failed to initialize game');
      setIsLoading(false);
    }
  };

  const handleOpponentAction = (action: PvPGameAction) => {
    // Show what opponent did
    let actionText = '';
    switch (action.type) {
      case 'PLAY_CARD':
        actionText = 'Opponent played a card';
        break;
      case 'ATTACK':
        actionText = 'Opponent attacked';
        break;
      case 'CAST_SPELL':
        actionText = 'Opponent cast a spell';
        break;
      case 'END_TURN':
        actionText = 'Opponent ended their turn';
        break;
    }

    setOpponentAction(actionText);
    setTimeout(() => setOpponentAction(null), 3000);
  };

  const handleMatchComplete = (winnerId?: string) => {
    const isWinner = winnerId === user?.uid;
    Alert.alert(
      'Match Complete',
      isWinner ? 'You won!' : 'You lost!',
      [
        {
          text: 'OK',
          onPress: () => onMatchEnd(winnerId),
        },
      ]
    );
  };

  const executeAction = async (action: GameAction) => {
    if (!pvpEngineRef.current) return;

    const success = await pvpEngineRef.current.executeAction(action);
    if (!success) {
      Alert.alert('Invalid Action', 'This action cannot be performed');
    }
  };

  const handlePlayCard = (cardId: string) => {
    if (!isMyTurn) {
      Alert.alert('Not Your Turn', 'Wait for your turn');
      return;
    }

    executeAction({
      type: 'PLAY_CARD',
      playerId: user?.uid || '',
      cardId,
    });
  };

  const handleAttack = (attackerCardId: string, targetCardId: string | undefined, attackName: string) => {
    if (!isMyTurn) {
      Alert.alert('Not Your Turn', 'Wait for your turn');
      return;
    }

    executeAction({
      type: 'ATTACK',
      playerId: user?.uid || '',
      cardId: attackerCardId,
      targetCardId,
      attackName,
    });
  };

  const handleRetireCard = (cardId: string) => {
    if (!isMyTurn) {
      Alert.alert('Not Your Turn', 'Wait for your turn');
      return;
    }

    executeAction({
      type: 'RETIRE_CARD',
      playerId: user?.uid || '',
      cardId,
    });
  };

  const handleCastSpell = (cardId: string) => {
    if (!isMyTurn) {
      Alert.alert('Not Your Turn', 'Wait for your turn');
      return;
    }

    executeAction({
      type: 'CAST_SPELL',
      playerId: user?.uid || '',
      cardId,
    });
  };

  const handleEndTurn = () => {
    if (!isMyTurn) {
      Alert.alert('Not Your Turn', 'Wait for your turn');
      return;
    }

    executeAction({
      type: 'END_TURN',
      playerId: user?.uid || '',
    });
  };

  const handleForfeit = () => {
    Alert.alert(
      'Forfeit Match',
      'Are you sure you want to forfeit? This will count as a loss.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Forfeit',
          style: 'destructive',
          onPress: async () => {
            await pvpEngineRef.current?.forfeit();
            onMatchEnd(isPlayer1 ? match.player2Id : match.player1Id);
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Initializing match...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <WifiOff size={48} color="#f44336" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeGame}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!gameState) {
    return null;
  }

  const myPlayer = gameState.players.find((p) => p.id === user?.uid);
  const opponent = gameState.players.find((p) => p.id !== user?.uid);

  if (!myPlayer || !opponent) {
    return null;
  }

  return (
    <LinearGradient colors={['#0a0a0f', '#1a1a2e']} style={styles.container}>
      {/* Connection Status */}
      <View style={styles.connectionStatus}>
        {isConnected ? (
          <Wifi size={16} color="#4CAF50" />
        ) : (
          <WifiOff size={16} color="#f44336" />
        )}
      </View>

      {/* Opponent Action Indicator */}
      {opponentAction && (
        <View style={styles.actionIndicator}>
          <Text style={styles.actionIndicatorText}>{opponentAction}</Text>
        </View>
      )}

      {/* Opponent Info */}
      <PlayerInfo
        player={opponent}
        isCurrentPlayer={!isMyTurn}
        isOpponent={true}
      />

      {/* Battlefield */}
      <Battlefield
        myPlayer={myPlayer}
        opponent={opponent}
        onPlayCard={handlePlayCard}
        onAttack={handleAttack}
        onRetireCard={handleRetireCard}
        onCastSpell={handleCastSpell}
        isMyTurn={isMyTurn}
      />

      {/* My Player Info */}
      <PlayerInfo
        player={myPlayer}
        isCurrentPlayer={isMyTurn}
        isOpponent={false}
      />

      {/* Status Bar */}
      <StatusBar
        turnNumber={gameState.turnNumber}
        currentPlayerName={currentPlayer?.name || ''}
        onEndTurn={handleEndTurn}
        canEndTurn={isMyTurn}
      />

      {/* Forfeit Button */}
      <TouchableOpacity style={styles.forfeitButton} onPress={handleForfeit}>
        <Flag size={20} color="#fff" />
        <Text style={styles.forfeitButtonText}>Forfeit</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a0f',
    gap: 16,
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  connectionStatus: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 100,
  },
  actionIndicator: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    padding: 12,
    zIndex: 100,
  },
  actionIndicatorText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  forfeitButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  forfeitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
});
