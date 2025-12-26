import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { PvPLobby } from '../components/pvp/PvPLobby';
import { PvPGameBoard } from '../components/pvp/PvPGameBoard';
import { usePvP } from '../context/PvPContext';
import { useDeck } from '../context/DeckContext';
import { useRouter } from 'expo-router';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { PvPMatch } from '../types/pvp';
import { Card } from '../types/game';

export default function PvPScreen() {
  const router = useRouter();
  const { currentMatch, setCurrentMatch, clearMatch } = usePvP();
  const { activeDeck, decks } = useDeck();
  const [matchData, setMatchData] = useState<{
    match: PvPMatch;
    playerDeck: Card[];
    opponentDeck: Card[];
  } | null>(null);

  useEffect(() => {
    if (currentMatch) {
      loadMatchData(currentMatch);
    }
  }, [currentMatch]);

  const loadMatchData = async (match: PvPMatch) => {
    try {
      // Load player deck
      const playerDeck = decks.find((d) => d.id === match.player1DeckId || d.id === match.player2DeckId);
      if (!playerDeck) {
        console.error('Player deck not found');
        return;
      }

      // For now, use the same deck for opponent (in production, this would be loaded from Firebase)
      const opponentDeck = playerDeck.cards;

      setMatchData({
        match,
        playerDeck: playerDeck.cards,
        opponentDeck,
      });
    } catch (error) {
      console.error('Error loading match data:', error);
    }
  };

  const handleMatchFound = async (matchId: string) => {
    try {
      // Load match from Firebase
      const matchDoc = await getDoc(doc(db, 'pvp_matches', matchId));
      if (matchDoc.exists()) {
        const match = matchDoc.data() as PvPMatch;
        setCurrentMatch(match);
      }
    } catch (error) {
      console.error('Error loading match:', error);
    }
  };

  const handleMatchEnd = (winnerId?: string) => {
    clearMatch();
    setMatchData(null);
    // Optionally navigate back or show results
  };

  return (
    <View style={styles.container}>
      {matchData ? (
        <PvPGameBoard
          match={matchData.match}
          playerDeck={matchData.playerDeck}
          opponentDeck={matchData.opponentDeck}
          onMatchEnd={handleMatchEnd}
        />
      ) : (
        <PvPLobby onMatchFound={handleMatchFound} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
});
