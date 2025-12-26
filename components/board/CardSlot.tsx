import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, DamageAnimation } from '@/types/game';
import { MiniCard } from './MiniCard';
import Colors from '@/constants/Colors';

interface CardSlotProps {
  card?: Card | null;
  position: 'top' | 'bottom';
  onPress?: () => void;
  selected?: boolean;
  disabled?: boolean;
  aiHighlight?: 'selected' | 'target' | null;
  damageAnimation?: DamageAnimation;
  attackMode?: boolean;
  showDamagePreview?: boolean;
  damagePreviewValue?: number;
}

/**
 * CardSlot - Represents a fixed position on the battlefield grid
 * Can be empty (placeholder) or occupied (shows MiniCard)
 */
export function CardSlot({
  card,
  position,
  onPress,
  selected = false,
  disabled = false,
  aiHighlight = null,
  damageAnimation,
  attackMode = false,
  showDamagePreview = false,
  damagePreviewValue,
}: CardSlotProps) {
  if (!card) {
    // Empty slot - show placeholder
    return (
      <View style={[styles.emptySlot, position === 'top' ? styles.emptySlotTop : styles.emptySlotBottom]}>
        <View style={styles.emptySlotInner} />
      </View>
    );
  }

  // Occupied slot - show mini card
  return (
    <View style={styles.occupiedSlot}>
      <MiniCard
        card={card}
        onPress={onPress}
        selected={selected}
        disabled={disabled}
        aiHighlight={aiHighlight}
        damageAnimation={damageAnimation}
      />

      {/* Damage preview badge */}
      {showDamagePreview && damagePreviewValue !== undefined && (
        <View style={styles.damagePreview}>
          <View style={[
            styles.damagePreviewBadge,
            damagePreviewValue > 0 && styles.damagePreviewPositive
          ]}>
            <Text style={styles.damagePreviewValue}>
              {damagePreviewValue}
            </Text>
          </View>
        </View>
      )}

      {/* Attack mode highlight */}
      {attackMode && position === 'top' && (
        <View style={styles.attackModeOverlay} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  emptySlot: {
    width: 60,
    height: 84,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySlotInner: {
    width: 56,
    height: 80,
    borderRadius: 6,
    borderWidth: 2,
    borderStyle: 'dashed',
    opacity: 0.3,
  },
  emptySlotTop: {
    borderColor: Colors.neutral[600],
  },
  emptySlotBottom: {
    borderColor: Colors.primary[600],
  },
  occupiedSlot: {
    position: 'relative',
  },
  damagePreview: {
    position: 'absolute',
    top: -8,
    right: -8,
  },
  damagePreviewBadge: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  damagePreviewPositive: {
    borderColor: '#4ECDC4',
  },
  damagePreviewValue: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  attackModeOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFC107',
  },
});
