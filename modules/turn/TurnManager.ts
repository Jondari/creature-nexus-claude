import { GameState, Player, GameAction } from '../../types/game';
import { PlayerUtils } from '../player';
import { Deck } from '../card/Deck';
import { isSpellCard } from '../../models/cards-extended';

export class TurnManager {
  static startTurn(gameState: GameState, playerDecks: [Deck, Deck]): GameState {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const currentDeck = playerDecks[gameState.currentPlayerIndex];
    
    // Calculate energy gain: 1 normal, or turn number if energy booster is active
    const energyGain = currentPlayer.hasEnergyBooster ? gameState.turnNumber : 1;
    let updatedPlayer = PlayerUtils.addEnergy(currentPlayer, energyGain);
    updatedPlayer = PlayerUtils.drawCard(updatedPlayer, currentDeck);
    
    const newPlayers: [Player, Player] = [...gameState.players] as [Player, Player];
    newPlayers[gameState.currentPlayerIndex] = updatedPlayer;

    const newGameState = {
      ...gameState,
      players: newPlayers,
      phase: 'main' as const,
      turnNumber: gameState.turnNumber + 1,
      attackedThisTurn: new Set<string>(), // Reset attack tracking for new turn
    };

    // Check win conditions after drawing card (deck-out condition)
    return TurnManager.checkWinConditions(newGameState, playerDecks);
  }

  static endTurn(gameState: GameState): GameState {
    const nextPlayerIndex = gameState.currentPlayerIndex === 0 ? 1 : 0;
    
    return {
      ...gameState,
      currentPlayerIndex: nextPlayerIndex,
      phase: 'draw',
    };
  }

  static checkWinConditions(gameState: GameState, playerDecks: [Deck, Deck]): GameState {
    const [player1, player2] = gameState.players;
    const [deck1, deck2] = playerDecks;

    let winner: string | undefined;

    if (PlayerUtils.hasWon(player1)) {
      winner = player1.id;
    } else if (PlayerUtils.hasWon(player2)) {
      winner = player2.id;
    } else if (PlayerUtils.hasLost(player1, deck1, gameState.turnNumber)) {
      winner = player2.id;
    } else if (PlayerUtils.hasLost(player2, deck2, gameState.turnNumber)) {
      winner = player1.id;
    }

    return {
      ...gameState,
      winner,
      isGameOver: winner !== undefined,
    };
  }

  static canPerformAction(gameState: GameState, action: GameAction): boolean {
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    
    if (action.playerId !== currentPlayer.id) return false;
    
    switch (action.type) {
      case 'PLAY_CARD':
        if (!action.cardId) return false;
        const card = currentPlayer.hand.find(c => c.id === action.cardId);
        return card ? PlayerUtils.canPlayCard(currentPlayer, card) : false;
        
      case 'RETIRE_CARD':
        if (!action.cardId) return false;
        return PlayerUtils.canRetireCard(currentPlayer, action.cardId);
        
      case 'ATTACK':
        // Player 1 cannot attack on turn 1
        if (gameState.currentPlayerIndex === 0 && gameState.turnNumber === 1) {
          return false;
        }
        return gameState.phase === 'main' || gameState.phase === 'combat';
        
      case 'CAST_SPELL':
        if (!action.cardId) return false;
        const spellCard = currentPlayer.hand.find(c => c.id === action.cardId);
        if (!spellCard || !isSpellCard(spellCard)) return false;
        return PlayerUtils.canCastSpell(currentPlayer, spellCard);
        
      case 'END_TURN':
        return true;
        
      default:
        return false;
    }
  }

  static getCurrentPlayer(gameState: GameState): Player {
    return gameState.players[gameState.currentPlayerIndex];
  }

  static getOpponent(gameState: GameState): Player {
    const opponentIndex = gameState.currentPlayerIndex === 0 ? 1 : 0;
    return gameState.players[opponentIndex];
  }
}