import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { usePvP } from '../../context/PvPContext';
import { useDeck } from '../../context/DeckContext';
import { t } from '../../utils/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Swords, Trophy, Clock, X } from 'lucide-react-native';
import { PvPInvitation } from '../../types/pvp';

interface PvPLobbyProps {
  onMatchFound: (matchId: string) => void;
}

export function PvPLobby({ onMatchFound }: PvPLobbyProps) {
  const [selectedTab, setSelectedTab] = useState<'quick' | 'invite' | 'stats'>('quick');
  const {
    isSearching,
    matchmakingStatus,
    activeInvitations,
    stats,
    joinMatchmaking,
    leaveMatchmaking,
    acceptInvitation,
    declineInvitation,
    error,
  } = usePvP();
  const { activeDeck } = useDeck();

  const handleQuickMatch = async () => {
    if (!activeDeck) {
      Alert.alert('No Deck', 'Please select a deck first');
      return;
    }

    try {
      await joinMatchmaking(activeDeck.id);
    } catch (err) {
      Alert.alert('Error', 'Failed to join matchmaking');
    }
  };

  const handleCancelSearch = async () => {
    try {
      await leaveMatchmaking();
    } catch (err) {
      Alert.alert('Error', 'Failed to leave matchmaking');
    }
  };

  const handleAcceptInvitation = async (invitation: PvPInvitation) => {
    if (!activeDeck) {
      Alert.alert('No Deck', 'Please select a deck first');
      return;
    }

    try {
      await acceptInvitation(invitation.id, activeDeck.id);
      // Navigation to match will be handled by the parent component
    } catch (err) {
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (invitation: PvPInvitation) => {
    try {
      await declineInvitation(invitation.id);
    } catch (err) {
      Alert.alert('Error', 'Failed to decline invitation');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#1a1a2e', '#16213e']} style={styles.header}>
        <Swords size={32} color="#FFD700" />
        <Text style={styles.title}>PvP Arena</Text>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'quick' && styles.tabActive]}
          onPress={() => setSelectedTab('quick')}
        >
          <Users size={20} color={selectedTab === 'quick' ? '#FFD700' : '#888'} />
          <Text style={[styles.tabText, selectedTab === 'quick' && styles.tabTextActive]}>
            Quick Match
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'invite' && styles.tabActive]}
          onPress={() => setSelectedTab('invite')}
        >
          <Clock size={20} color={selectedTab === 'invite' ? '#FFD700' : '#888'} />
          <Text style={[styles.tabText, selectedTab === 'invite' && styles.tabTextActive]}>
            Invitations ({activeInvitations.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'stats' && styles.tabActive]}
          onPress={() => setSelectedTab('stats')}
        >
          <Trophy size={20} color={selectedTab === 'stats' ? '#FFD700' : '#888'} />
          <Text style={[styles.tabText, selectedTab === 'stats' && styles.tabTextActive]}>
            Stats
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {selectedTab === 'quick' && (
          <View style={styles.quickMatchContent}>
            {!isSearching ? (
              <>
                <Text style={styles.description}>
                  Find a random opponent and battle in real-time!
                </Text>

                {activeDeck && (
                  <View style={styles.deckInfo}>
                    <Text style={styles.deckLabel}>Selected Deck:</Text>
                    <Text style={styles.deckName}>{activeDeck.name}</Text>
                    <Text style={styles.deckCards}>{activeDeck.cards.length} cards</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.button, styles.buttonPrimary, !activeDeck && styles.buttonDisabled]}
                  onPress={handleQuickMatch}
                  disabled={!activeDeck}
                >
                  <Users size={20} color="#fff" />
                  <Text style={styles.buttonText}>Find Match</Text>
                </TouchableOpacity>

                {stats && (
                  <View style={styles.quickStats}>
                    <Text style={styles.quickStatsText}>ELO: {stats.elo}</Text>
                    <Text style={styles.quickStatsText}>
                      W/L: {stats.wins}/{stats.losses}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.searching}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={styles.searchingText}>Searching for opponent...</Text>
                <Text style={styles.searchingSubtext}>
                  This may take a moment
                </Text>

                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary]}
                  onPress={handleCancelSearch}
                >
                  <X size={20} color="#fff" />
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>
        )}

        {selectedTab === 'invite' && (
          <View style={styles.invitationsContent}>
            {activeInvitations.length === 0 ? (
              <View style={styles.emptyState}>
                <Clock size={48} color="#555" />
                <Text style={styles.emptyText}>No pending invitations</Text>
              </View>
            ) : (
              activeInvitations.map((invitation) => (
                <View key={invitation.id} style={styles.invitationCard}>
                  <View style={styles.invitationHeader}>
                    <Text style={styles.invitationFrom}>{invitation.fromUserName}</Text>
                    <Text style={styles.invitationTime}>
                      {getTimeAgo(invitation.createdAt)}
                    </Text>
                  </View>

                  <Text style={styles.invitationText}>
                    invited you to a PvP match
                  </Text>

                  <View style={styles.invitationActions}>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonSmall, styles.buttonPrimary]}
                      onPress={() => handleAcceptInvitation(invitation)}
                    >
                      <Text style={styles.buttonTextSmall}>Accept</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.button, styles.buttonSmall, styles.buttonSecondary]}
                      onPress={() => handleDeclineInvitation(invitation)}
                    >
                      <Text style={styles.buttonTextSmall}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {selectedTab === 'stats' && (
          <View style={styles.statsContent}>
            {stats ? (
              <>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>ELO Rating</Text>
                  <Text style={styles.statValue}>{stats.elo}</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Total Matches</Text>
                  <Text style={styles.statValue}>{stats.totalMatches}</Text>
                </View>

                <View style={styles.statsRow}>
                  <View style={[styles.statCard, styles.statCardHalf]}>
                    <Text style={styles.statLabel}>Wins</Text>
                    <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                      {stats.wins}
                    </Text>
                  </View>

                  <View style={[styles.statCard, styles.statCardHalf]}>
                    <Text style={styles.statLabel}>Losses</Text>
                    <Text style={[styles.statValue, { color: '#f44336' }]}>
                      {stats.losses}
                    </Text>
                  </View>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Win Rate</Text>
                  <Text style={styles.statValue}>{stats.winRate.toFixed(1)}%</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Current Streak</Text>
                  <Text
                    style={[
                      styles.statValue,
                      { color: stats.currentStreak >= 0 ? '#4CAF50' : '#f44336' },
                    ]}
                  >
                    {stats.currentStreak > 0 ? '+' : ''}
                    {stats.currentStreak}
                  </Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>Longest Win Streak</Text>
                  <Text style={[styles.statValue, { color: '#FFD700' }]}>
                    {stats.longestWinStreak}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.emptyState}>
                <Trophy size={48} color="#555" />
                <Text style={styles.emptyText}>No stats yet</Text>
                <Text style={styles.emptySubtext}>Play your first match to start!</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#FFD700',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
  },
  tabTextActive: {
    color: '#FFD700',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  quickMatchContent: {
    alignItems: 'center',
    gap: 20,
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 20,
  },
  deckInfo: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  deckLabel: {
    fontSize: 14,
    color: '#888',
  },
  deckName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  deckCards: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    minWidth: 200,
  },
  buttonPrimary: {
    backgroundColor: '#FFD700',
  },
  buttonSecondary: {
    backgroundColor: '#555',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  buttonSmall: {
    padding: 10,
    minWidth: 100,
  },
  buttonTextSmall: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  quickStats: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 8,
  },
  quickStatsText: {
    fontSize: 14,
    color: '#ccc',
  },
  searching: {
    alignItems: 'center',
    gap: 16,
    marginTop: 40,
  },
  searchingText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  searchingSubtext: {
    fontSize: 14,
    color: '#888',
  },
  errorContainer: {
    backgroundColor: '#f44336',
    padding: 12,
    borderRadius: 8,
    width: '100%',
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
  },
  invitationsContent: {
    gap: 12,
  },
  invitationCard: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  invitationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invitationFrom: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  invitationTime: {
    fontSize: 12,
    color: '#888',
  },
  invitationText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 12,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  statsContent: {
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCardHalf: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
  },
});
