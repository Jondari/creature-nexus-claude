import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { t } from '@/utils/i18n';
import PuzzleBoard from '@/components/PuzzleBoard';
import monsterCardsData from '@/data/monster-cards.json';

interface Monster {
  name: string;
  rarity: string;
  element: string;
  hp: number;
  attacks: { name: string; damage: number; energy: number }[];
}

export default function PuzzleQuestScreen() {
  const router = useRouter();
  const [playerMonster, setPlayerMonster] = useState<Monster | null>(null);
  const [enemyMonster, setEnemyMonster] = useState<Monster | null>(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [enemyMaxHp, setEnemyMaxHp] = useState(100);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<'player' | 'enemy' | null>(null);

  useEffect(() => {
    // Select random monsters for player and enemy
    const monsters = monsterCardsData as Monster[];
    const playerIndex = Math.floor(Math.random() * monsters.length);
    let enemyIndex = Math.floor(Math.random() * monsters.length);

    // Ensure different monsters
    while (enemyIndex === playerIndex) {
      enemyIndex = Math.floor(Math.random() * monsters.length);
    }

    const player = monsters[playerIndex];
    const enemy = monsters[enemyIndex];

    setPlayerMonster(player);
    setEnemyMonster(enemy);
    setPlayerHp(player.hp);
    setPlayerMaxHp(player.hp);
    setEnemyHp(enemy.hp);
    setEnemyMaxHp(enemy.hp);
  }, []);

  const handleMatchDamage = (damage: number, element: string) => {
    if (!isPlayerTurn || gameOver) return;

    // Calculate damage based on element matching
    let finalDamage = damage;
    if (playerMonster && enemyMonster) {
      // Bonus damage if element matches player's monster
      if (element === playerMonster.element) {
        finalDamage = Math.floor(damage * 1.5);
      }
      // Reduced damage if element matches enemy's monster
      if (element === enemyMonster.element) {
        finalDamage = Math.floor(damage * 0.75);
      }
    }

    const newEnemyHp = Math.max(0, enemyHp - finalDamage);
    setEnemyHp(newEnemyHp);

    if (newEnemyHp <= 0) {
      setGameOver(true);
      setWinner('player');
    } else {
      // AI turn
      setIsPlayerTurn(false);
      setTimeout(() => {
        aiTurn();
      }, 1500);
    }
  };

  const aiTurn = () => {
    // Simple AI: random damage between 5-15
    const damage = Math.floor(Math.random() * 11) + 5;
    const newPlayerHp = Math.max(0, playerHp - damage);
    setPlayerHp(newPlayerHp);

    if (newPlayerHp <= 0) {
      setGameOver(true);
      setWinner('enemy');
    } else {
      setIsPlayerTurn(true);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleRestart = () => {
    setGameOver(false);
    setWinner(null);
    setIsPlayerTurn(true);

    // Re-select monsters
    const monsters = monsterCardsData as Monster[];
    const playerIndex = Math.floor(Math.random() * monsters.length);
    let enemyIndex = Math.floor(Math.random() * monsters.length);

    while (enemyIndex === playerIndex) {
      enemyIndex = Math.floor(Math.random() * monsters.length);
    }

    const player = monsters[playerIndex];
    const enemy = monsters[enemyIndex];

    setPlayerMonster(player);
    setEnemyMonster(enemy);
    setPlayerHp(player.hp);
    setPlayerMaxHp(player.hp);
    setEnemyHp(enemy.hp);
    setEnemyMaxHp(enemy.hp);
  };

  const getMonsterImage = (monster: Monster | null) => {
    if (!monster) return null;

    try {
      const imageName = monster.name.toLowerCase();
      const rarity = monster.rarity;

      // Map to the correct image path
      return require(`../../assets/images/${rarity}/${imageName}.png`);
    } catch (error) {
      return null;
    }
  };

  if (!playerMonster || !enemyMonster) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[Colors.primary[900], Colors.background.primary]}
          style={styles.background}
        />
        <Text style={styles.loadingText}>{t('puzzleQuest.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[Colors.primary[900], Colors.background.primary]}
        style={styles.background}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('puzzleQuest.title')}</Text>
        <View style={styles.backButton} />
      </View>

      {/* Battle Area */}
      <View style={styles.battleArea}>
        {/* Enemy Monster */}
        <View style={styles.monsterContainer}>
          <View style={styles.monsterCard}>
            {getMonsterImage(enemyMonster) && (
              <Image
                source={getMonsterImage(enemyMonster)}
                style={styles.monsterImage}
                resizeMode="cover"
              />
            )}
          </View>
          <View style={styles.hpBarContainer}>
            <View style={styles.hpBarBackground}>
              <LinearGradient
                colors={['#e84b55', '#df8c2b']}
                style={[
                  styles.hpBarFill,
                  { width: `${(enemyHp / enemyMaxHp) * 100}%` },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.hpText}>
              {enemyHp} / {enemyMaxHp}
            </Text>
          </View>
          <Text style={styles.monsterName}>{enemyMonster.name}</Text>
        </View>

        {/* Player Monster */}
        <View style={styles.monsterContainer}>
          <View style={styles.monsterCard}>
            {getMonsterImage(playerMonster) && (
              <Image
                source={getMonsterImage(playerMonster)}
                style={styles.monsterImage}
                resizeMode="cover"
              />
            )}
          </View>
          <View style={styles.hpBarContainer}>
            <View style={styles.hpBarBackground}>
              <LinearGradient
                colors={['#3e7cc9', '#9855d4']}
                style={[
                  styles.hpBarFill,
                  { width: `${(playerHp / playerMaxHp) * 100}%` },
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.hpText}>
              {playerHp} / {playerMaxHp}
            </Text>
          </View>
          <Text style={styles.monsterName}>{playerMonster.name}</Text>
        </View>
      </View>

      {/* Turn Indicator */}
      <View style={styles.turnIndicator}>
        <Text style={styles.turnText}>
          {gameOver
            ? winner === 'player'
              ? t('puzzleQuest.victory')
              : t('puzzleQuest.defeat')
            : isPlayerTurn
            ? t('puzzleQuest.yourTurn')
            : t('puzzleQuest.enemyTurn')}
        </Text>
      </View>

      {/* Puzzle Board */}
      <PuzzleBoard
        onMatchDamage={handleMatchDamage}
        disabled={!isPlayerTurn || gameOver}
        playerElement={playerMonster.element}
      />

      {/* Game Over Overlay */}
      {gameOver && (
        <View style={styles.gameOverOverlay}>
          <LinearGradient
            colors={[
              winner === 'player' ? '#9855d4' : '#e84b55',
              winner === 'player' ? '#3e7cc9' : '#df8c2b',
            ]}
            style={styles.gameOverCard}
          >
            <Text style={styles.gameOverTitle}>
              {winner === 'player' ? t('puzzleQuest.victory') : t('puzzleQuest.defeat')}
            </Text>
            <Text style={styles.gameOverText}>
              {winner === 'player'
                ? `${playerMonster.name} defeated ${enemyMonster.name}!`
                : `${enemyMonster.name} defeated ${playerMonster.name}!`}
            </Text>
            <View style={styles.gameOverButtons}>
              <TouchableOpacity
                style={styles.gameOverButton}
                onPress={handleRestart}
              >
                <Text style={styles.gameOverButtonText}>{t('puzzleQuest.playAgain')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.gameOverButton, styles.gameOverButtonSecondary]}
                onPress={handleBack}
              >
                <Text style={styles.gameOverButtonText}>{t('puzzleQuest.backToArena')}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Poppins-Bold',
    color: Colors.text.primary,
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: Colors.text.primary,
    textAlign: 'center',
    marginTop: 100,
  },
  battleArea: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  monsterContainer: {
    alignItems: 'center',
    flex: 1,
  },
  monsterCard: {
    width: 100,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: Colors.background.card,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  monsterImage: {
    width: '100%',
    height: '100%',
  },
  hpBarContainer: {
    marginTop: 8,
    width: '100%',
    alignItems: 'center',
  },
  hpBarBackground: {
    width: '100%',
    height: 12,
    backgroundColor: Colors.neutral[700],
    borderRadius: 6,
    overflow: 'hidden',
  },
  hpBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  hpText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.text.primary,
    marginTop: 4,
  },
  monsterName: {
    fontSize: 14,
    fontFamily: 'Poppins-Bold',
    color: Colors.text.primary,
    marginTop: 4,
  },
  turnIndicator: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  turnText: {
    fontSize: 18,
    fontFamily: 'Poppins-Bold',
    color: Colors.accent[400],
  },
  gameOverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  gameOverCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  gameOverTitle: {
    fontSize: 36,
    fontFamily: 'Poppins-Bold',
    color: Colors.text.primary,
    marginBottom: 16,
  },
  gameOverText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: Colors.text.primary,
    textAlign: 'center',
    marginBottom: 32,
  },
  gameOverButtons: {
    width: '100%',
    gap: 12,
  },
  gameOverButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  gameOverButtonSecondary: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  gameOverButtonText: {
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    color: Colors.text.primary,
  },
});
