import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';

interface StatDescriptor {
  label: string;
  value: React.ReactNode;
}

interface PlayerInfoProps {
  name: string;
  stats: StatDescriptor[];
  subtitle?: React.ReactNode;
  containerRef?: React.Ref<View>;
}

export function PlayerInfo({
  name,
  stats,
  subtitle,
  containerRef,
}: PlayerInfoProps) {
  return (
    <View ref={containerRef} style={styles.container}>
      <Text style={styles.playerName}>{name}</Text>

      {subtitle ? (
        <View style={styles.subtitleContainer}>
          {typeof subtitle === 'string' ? (
            <Text style={styles.subtitleText}>{subtitle}</Text>
          ) : (
            subtitle
          )}
        </View>
      ) : null}

      <View style={styles.statsRow}>
        {stats.map(({ label, value }, index) => (
          <Text key={`${label}-${index}`} style={styles.statText}>
            {label}: {value}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background.card,
    padding: 12,
    margin: 8,
    borderRadius: 8,
    boxShadow: '0px 1px 2.22px 0px rgba(0, 0, 0, 0.22)',
    elevation: 3,
  },
  playerName: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: Colors.text.primary,
  },
  subtitleContainer: {
    marginBottom: 8,
    alignItems: 'center',
  },
  subtitleText: {
    fontSize: 12,
    color: Colors.text.secondary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statText: {
    color: Colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
});
