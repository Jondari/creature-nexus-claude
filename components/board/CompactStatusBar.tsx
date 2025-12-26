import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Colors from '@/constants/Colors';
import { t } from '@/utils/i18n';

interface CompactStatusBarProps {
  turnNumber: number;
  phase: string;
  isPlayerTurn: boolean;
  aiStatus?: string | null;
  onEndTurn?: () => void;
  showEndTurnButton?: boolean;
  onShowRules?: () => void;
  onToggleBattleLog?: () => void;
  showBattleLog?: boolean;
  containerRef?: React.Ref<View>;
  endTurnButtonRef?: React.Ref<TouchableOpacity>;
}

/**
 * CompactStatusBar - Minimal central game status display
 * Shows turn, phase, and action buttons in a compact layout
 */
export function CompactStatusBar({
  turnNumber,
  phase,
  isPlayerTurn,
  aiStatus,
  onEndTurn,
  showEndTurnButton = false,
  onShowRules,
  onToggleBattleLog,
  showBattleLog = false,
  containerRef,
  endTurnButtonRef,
}: CompactStatusBarProps) {
  return (
    <View ref={containerRef} style={styles.container}>
      <View style={styles.content}>
        {/* Turn & Phase info */}
        <View style={styles.infoSection}>
          <View style={styles.turnBadge}>
            <Text style={styles.turnLabel}>TURN</Text>
            <Text style={styles.turnNumber}>{turnNumber}</Text>
          </View>

          <View style={styles.phaseBadge}>
            <Text style={styles.phaseText}>
              {t(`phases.${phase}`).toUpperCase()}
            </Text>
          </View>

          <View style={[styles.turnIndicator, isPlayerTurn ? styles.playerTurn : styles.aiTurn]}>
            <Text style={styles.turnIndicatorText}>
              {isPlayerTurn ? '▼ YOU' : '▲ AI'}
            </Text>
          </View>
        </View>

        {/* AI Status */}
        {aiStatus && (
          <View style={styles.aiStatusSection}>
            <Text style={styles.aiStatusText}>{aiStatus}</Text>
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionsSection}>
          {/* Rules button */}
          {onShowRules && (
            <TouchableOpacity style={styles.iconButton} onPress={onShowRules}>
              <Text style={styles.iconButtonText}>ℹ️</Text>
            </TouchableOpacity>
          )}

          {/* Battle log button */}
          {showBattleLog && onToggleBattleLog && (
            <TouchableOpacity style={styles.iconButton} onPress={onToggleBattleLog}>
              <Text style={styles.iconButtonText}>📋</Text>
            </TouchableOpacity>
          )}

          {/* End turn button */}
          {showEndTurnButton && onEndTurn && (
            <TouchableOpacity
              ref={endTurnButtonRef}
              style={styles.endTurnButton}
              onPress={onEndTurn}
            >
              <Text style={styles.endTurnText}>{t('actions.endTurn')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 8,
    marginVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 12,
  },
  infoSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  turnBadge: {
    backgroundColor: Colors.primary[600],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 50,
  },
  turnLabel: {
    fontSize: 8,
    fontWeight: 'bold',
    color: Colors.text.primary,
    marginBottom: 2,
  },
  turnNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  phaseBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  phaseText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.text.primary,
    letterSpacing: 0.5,
  },
  turnIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2,
  },
  playerTurn: {
    backgroundColor: 'rgba(0, 100, 200, 0.2)',
    borderColor: Colors.primary[600],
  },
  aiTurn: {
    backgroundColor: 'rgba(139, 0, 0, 0.2)',
    borderColor: '#8B0000',
  },
  turnIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: Colors.text.primary,
  },
  aiStatusSection: {
    flex: 1,
    paddingHorizontal: 12,
  },
  aiStatusText: {
    fontSize: 11,
    color: Colors.text.secondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  iconButtonText: {
    fontSize: 16,
  },
  endTurnButton: {
    backgroundColor: Colors.accent[600],
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.accent[700],
  },
  endTurnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.text.primary,
    textTransform: 'uppercase',
  },
});
