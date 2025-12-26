import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, DamageAnimation } from '@/types/game';
import { CardSlot } from './CardSlot';
import Colors from '@/constants/Colors';
import { t } from '@/utils/i18n';

interface BattlefieldGridProps {
  // Card zones
  fieldCards: Card[];
  maxFieldSize?: number;
  position: 'top' | 'bottom';

  // Deck & graveyard info
  deckSize: number;
  graveyardSize: number;

  // Interactions
  onCardPress?: (card: Card) => void;
  selectedCardId?: string | null;
  disabled?: boolean;

  // Attack mode
  attackMode?: { cardId: string; attackName: string } | null;
  previewDamage?: (card: Card) => { base: number; affinity: number; total: number } | null;

  // AI visualization
  aiHighlight?: (cardId: string) => 'selected' | 'target' | null;
  damageAnimation?: (cardId: string) => DamageAnimation | undefined;

  // Additional zone interactions
  onDeckPress?: () => void;
  onGraveyardPress?: () => void;
}

/**
 * BattlefieldGrid - Master Duel style fixed grid layout
 * Shows all zones: monster zones, deck, graveyard in a spatial layout
 */
export function BattlefieldGrid({
  fieldCards,
  maxFieldSize = 4,
  position,
  deckSize,
  graveyardSize,
  onCardPress,
  selectedCardId,
  disabled = false,
  attackMode,
  previewDamage,
  aiHighlight,
  damageAnimation,
  onDeckPress,
  onGraveyardPress,
}: BattlefieldGridProps) {
  // Fill empty slots to always show maxFieldSize positions
  const slots: (Card | null)[] = [...fieldCards];
  while (slots.length < maxFieldSize) {
    slots.push(null);
  }

  const isTopPlayer = position === 'top';

  return (
    <View style={[styles.container, isTopPlayer ? styles.containerTop : styles.containerBottom]}>
      <LinearGradient
        colors={isTopPlayer ? ['rgba(139, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.05)'] : ['rgba(0, 100, 200, 0.1)', 'rgba(0, 0, 0, 0.05)']}
        style={styles.background}
      >
        {/* Main battlefield area */}
        <View style={styles.mainArea}>
          {/* Side zones (deck & graveyard) */}
          <View style={styles.sideZones}>
            {/* Deck */}
            <TouchableOpacity
              style={styles.deckZone}
              onPress={onDeckPress}
              disabled={!onDeckPress}
            >
              <View style={[styles.zoneBox, styles.deckBox]}>
                <Text style={styles.zoneLabel}>DECK</Text>
                <Text style={styles.zoneCount}>{deckSize}</Text>
              </View>
            </TouchableOpacity>

            {/* Graveyard */}
            <TouchableOpacity
              style={styles.graveyardZone}
              onPress={onGraveyardPress}
              disabled={!onGraveyardPress}
            >
              <View style={[styles.zoneBox, styles.graveyardBox]}>
                <Text style={styles.zoneLabel}>GY</Text>
                <Text style={styles.zoneCount}>{graveyardSize}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Monster zones - 4 slots in a row */}
          <View style={styles.monsterZones}>
            {slots.map((card, index) => {
              const preview = card && previewDamage ? previewDamage(card) : null;

              return (
                <CardSlot
                  key={card?.id || `empty-${index}`}
                  card={card}
                  position={position}
                  onPress={card && onCardPress ? () => onCardPress(card) : undefined}
                  selected={card?.id === selectedCardId}
                  disabled={disabled}
                  aiHighlight={card ? aiHighlight?.(card.id) : null}
                  damageAnimation={card ? damageAnimation?.(card.id) : undefined}
                  attackMode={!!attackMode && position === 'top'}
                  showDamagePreview={!!preview && position === 'top'}
                  damagePreviewValue={preview?.total}
                />
              );
            })}
          </View>
        </View>

        {/* Field label */}
        <View style={styles.labelContainer}>
          <Text style={styles.fieldLabel}>
            {isTopPlayer ? t('game.opponentField') : t('game.yourField')}
          </Text>
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
  containerTop: {
    // Opponent field styling
  },
  containerBottom: {
    // Player field styling
  },
  background: {
    padding: 12,
  },
  mainArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sideZones: {
    gap: 8,
  },
  deckZone: {
    width: 50,
    height: 40,
  },
  graveyardZone: {
    width: 50,
    height: 40,
  },
  zoneBox: {
    flex: 1,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  deckBox: {
    borderColor: Colors.primary[600],
  },
  graveyardBox: {
    borderColor: Colors.neutral[600],
  },
  zoneLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  zoneCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  monsterZones: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  labelContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
