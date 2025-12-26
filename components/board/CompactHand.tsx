import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Card } from '@/types/game';
import { MiniCard } from './MiniCard';
import { CardActionButtons } from '../CardActionButtons';
import Colors from '@/constants/Colors';
import { t } from '@/utils/i18n';

interface CompactHandProps {
  cards: Card[];
  selectedCardId?: string | null;
  onCardPress?: (card: Card) => void;
  showActions?: (card: Card) => boolean;
  onPlayCard?: (cardId: string) => void;
  disabled?: boolean;
  containerRef?: React.Ref<View>;
}

/**
 * CompactHand - Horizontal scrollable hand with mini cards
 * More compact than the original hand display
 */
export function CompactHand({
  cards,
  selectedCardId,
  onCardPress,
  showActions,
  onPlayCard,
  disabled = false,
  containerRef,
}: CompactHandProps) {
  return (
    <View ref={containerRef} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{t('player.hand')}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{cards.length}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsHorizontalScrollIndicator={false}
      >
        {cards.map((card) => {
          const isSelected = selectedCardId === card.id;
          const actionsVisible = showActions ? showActions(card) : false;

          return (
            <View key={card.id} style={styles.cardContainer}>
              <MiniCard
                card={card}
                onPress={onCardPress ? () => onCardPress(card) : undefined}
                selected={isSelected}
                disabled={disabled}
              />

              {/* Card action buttons */}
              {actionsVisible && onPlayCard && (
                <View style={styles.actionsOverlay}>
                  <CardActionButtons
                    visible={true}
                    showPlay={true}
                    onPlay={() => onPlayCard(card.id)}
                    cardSize="small"
                    card={card}
                  />
                </View>
              )}
            </View>
          );
        })}

        {cards.length === 0 && (
          <View style={styles.emptyHand}>
            <Text style={styles.emptyText}>{t('game.emptyHand')}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
    marginVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countBadge: {
    backgroundColor: Colors.accent[600],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  countText: {
    color: Colors.text.primary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: 8,
    flexDirection: 'row',
  },
  cardContainer: {
    position: 'relative',
    marginRight: 8,
  },
  actionsOverlay: {
    position: 'absolute',
    top: -30,
    left: 0,
    right: 0,
  },
  emptyHand: {
    paddingVertical: 30,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
});
