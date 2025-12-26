import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, DamageAnimation } from '@/types/game';
import { isMonsterCard, isSpellCard } from '@/models/cards-extended';
import { DamageEffect } from '../DamageEffect';
import Colors from '@/constants/Colors';

interface MiniCardProps {
  card: Card;
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  aiHighlight?: 'selected' | 'target' | null;
  damageAnimation?: DamageAnimation;
}

/**
 * MiniCard - Ultra-compact card component for zoomed-out battlefield view
 * Displays minimal info: HP, element icon, and visual indicators
 */
export function MiniCard({
  card,
  onPress,
  selected = false,
  disabled = false,
  aiHighlight = null,
  damageAnimation,
}: MiniCardProps) {
  const isPremium = card.rarity === 'legendary' || card.rarity === 'mythic';
  const elementColor = getElementColor(card.element);
  const rarityColor = getRarityBorderColor(card.rarity);

  const borderColor = selected
    ? Colors.accent[400]
    : aiHighlight === 'selected'
    ? '#4CAF50'
    : aiHighlight === 'target'
    ? '#FF5722'
    : rarityColor;

  return (
    <DamageEffect
      isActive={damageAnimation?.isActive || false}
      duration={damageAnimation?.duration || 1000}
    >
      <TouchableOpacity
        style={[
          styles.container,
          { borderColor },
          isPremium && styles.premiumGlow,
          disabled && styles.disabled,
        ]}
        onPress={onPress}
        disabled={disabled}
      >
        <LinearGradient
          colors={isPremium ? ['rgba(255,215,0,0.3)', 'rgba(255,140,0,0.2)'] : ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)']}
          style={styles.background}
        >
          {/* Element indicator bar */}
          <View style={[styles.elementBar, { backgroundColor: elementColor }]} />

          {/* Card content */}
          <View style={styles.content}>
            {/* HP Badge for monsters */}
            {isMonsterCard(card) && (
              <View style={[styles.hpBadge, { backgroundColor: elementColor }]}>
                <Text style={styles.hpText}>{card.hp}</Text>
              </View>
            )}

            {/* Energy cost for spells */}
            {isSpellCard(card) && (
              <View style={[styles.costBadge, { backgroundColor: elementColor }]}>
                <Text style={styles.costText}>{card.energyCost}</Text>
              </View>
            )}

            {/* Attack count indicator */}
            {isMonsterCard(card) && card.attacks.length > 0 && (
              <View style={styles.attackIndicator}>
                {card.attacks.map((_, idx) => (
                  <View
                    key={idx}
                    style={[styles.attackDot, { backgroundColor: elementColor }]}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Rarity indicator */}
          {isPremium && <View style={styles.premiumStar}>
            <Text style={styles.starText}>★</Text>
          </View>}
        </LinearGradient>
      </TouchableOpacity>
    </DamageEffect>
  );
}

function getElementColor(element: string): string {
  const colors = {
    fire: '#FF6B6B',
    water: '#4ECDC4',
    air: '#95E1D3',
    earth: '#D4A574',
    all: '#9B59B6',
  };
  return colors[element as keyof typeof colors] || '#777';
}

function getRarityBorderColor(rarity: string): string {
  switch (rarity) {
    case 'common':
      return Colors.common;
    case 'rare':
      return Colors.rare;
    case 'epic':
      return Colors.epic;
    case 'legendary':
      return '#FFD700';
    case 'mythic':
      return '#FF00FF';
    default:
      return Colors.neutral[400];
  }
}

const styles = StyleSheet.create({
  container: {
    width: 60,
    height: 84,
    borderRadius: 6,
    borderWidth: 2,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  background: {
    flex: 1,
    position: 'relative',
  },
  elementBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  content: {
    flex: 1,
    padding: 4,
    justifyContent: 'space-between',
  },
  hpBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  hpText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  costBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  costText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  attackIndicator: {
    flexDirection: 'row',
    gap: 2,
    alignSelf: 'center',
  },
  attackDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  premiumGlow: {
    shadowColor: '#FFD700',
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 4,
  },
  premiumStar: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  starText: {
    color: '#FFD700',
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
