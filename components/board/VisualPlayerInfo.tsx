import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';

interface VisualPlayerInfoProps {
  name: string;
  energy: number;
  points: number;
  handSize: number;
  position: 'top' | 'bottom';
  containerRef?: React.Ref<View>;
}

/**
 * VisualPlayerInfo - Compact visual representation of player stats
 * Uses icons and badges instead of verbose text labels
 */
export function VisualPlayerInfo({
  name,
  energy,
  points,
  handSize,
  position,
  containerRef,
}: VisualPlayerInfoProps) {
  const isTopPlayer = position === 'top';

  return (
    <View ref={containerRef} style={styles.container}>
      <LinearGradient
        colors={isTopPlayer ? ['rgba(139, 0, 0, 0.2)', 'rgba(139, 0, 0, 0.1)'] : ['rgba(0, 100, 200, 0.2)', 'rgba(0, 100, 200, 0.1)']}
        style={styles.background}
      >
        <View style={styles.content}>
          {/* Player name */}
          <View style={styles.nameSection}>
            <Text style={styles.playerName} numberOfLines={1}>
              {name}
            </Text>
          </View>

          {/* Stats badges */}
          <View style={styles.statsSection}>
            {/* HP Badge */}
            <View style={[styles.statBadge, styles.hpBadge]}>
              <Text style={styles.statIcon}>❤️</Text>
              <Text style={styles.statValue}>{points}</Text>
            </View>

            {/* Energy Badge */}
            <View style={[styles.statBadge, styles.energyBadge]}>
              <Text style={styles.statIcon}>⚡</Text>
              <Text style={styles.statValue}>{energy}</Text>
            </View>

            {/* Hand Size Badge */}
            <View style={[styles.statBadge, styles.handBadge]}>
              <Text style={styles.statIcon}>🃏</Text>
              <Text style={styles.statValue}>{handSize}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  background: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nameSection: {
    flex: 1,
    marginRight: 12,
  },
  playerName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  statsSection: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    minWidth: 50,
    borderWidth: 2,
  },
  hpBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderColor: '#FF6B6B',
  },
  energyBadge: {
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderColor: '#FFC107',
  },
  handBadge: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    borderColor: '#4ECDC4',
  },
  statIcon: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
});
