import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import {
  MatchmakingQueue,
  MatchmakingPlayer,
  MatchmakingStatus,
  PvPMatch,
  PvPInvitation,
  PvPStats,
  PvPMatchResult,
  PVP_CONSTANTS,
  InvitationStatus,
} from '../types/pvp';

const COLLECTIONS = {
  MATCHMAKING_QUEUE: 'pvp_matchmaking_queue',
  MATCHES: 'pvp_matches',
  INVITATIONS: 'pvp_invitations',
  STATS: 'pvp_stats',
  MATCH_RESULTS: 'pvp_match_results',
};

class PvPMatchmakingService {
  // ==================== MATCHMAKING QUEUE ====================

  /**
   * Join the matchmaking queue
   */
  async joinQueue(userName: string, deckId: string): Promise<string> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error('User not authenticated');

    const queueId = `queue_${userId}_${Date.now()}`;
    const player: MatchmakingPlayer = {
      userId,
      userName,
      deckId,
      elo: (await this.getPlayerStats(userId))?.elo || PVP_CONSTANTS.INITIAL_ELO,
      enteredAt: Date.now(),
    };

    const queueEntry: MatchmakingQueue = {
      id: queueId,
      player,
      status: 'searching',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(doc(db, COLLECTIONS.MATCHMAKING_QUEUE, queueId), queueEntry);

    // Start matchmaking process
    this.findMatch(queueId, player);

    return queueId;
  }

  /**
   * Leave the matchmaking queue
   */
  async leaveQueue(queueId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.MATCHMAKING_QUEUE, queueId), {
      status: 'cancelled',
      updatedAt: Date.now(),
    });

    // Clean up after a delay
    setTimeout(() => {
      deleteDoc(doc(db, COLLECTIONS.MATCHMAKING_QUEUE, queueId));
    }, 5000);
  }

  /**
   * Find a suitable match for a player
   */
  private async findMatch(queueId: string, player: MatchmakingPlayer): Promise<void> {
    try {
      // Query for other players in queue
      const q = query(
        collection(db, COLLECTIONS.MATCHMAKING_QUEUE),
        where('status', '==', 'searching'),
        where('player.userId', '!=', player.userId),
        orderBy('player.userId'),
        orderBy('player.enteredAt'),
        limit(10)
      );

      const snapshot = await getDocs(q);

      // Find best match based on ELO
      let bestMatch: MatchmakingQueue | null = null;
      let smallestEloDiff = Infinity;

      snapshot.forEach((doc) => {
        const opponent = doc.data() as MatchmakingQueue;
        const eloDiff = Math.abs((opponent.player.elo || PVP_CONSTANTS.INITIAL_ELO) - (player.elo || PVP_CONSTANTS.INITIAL_ELO));

        if (eloDiff < PVP_CONSTANTS.MAX_ELO_DIFFERENCE && eloDiff < smallestEloDiff) {
          smallestEloDiff = eloDiff;
          bestMatch = opponent;
        }
      });

      // Create match if found
      if (bestMatch) {
        await this.createMatch(queueId, player, bestMatch.id, bestMatch.player);
      }
    } catch (error) {
      console.error('Error finding match:', error);
    }
  }

  /**
   * Create a PvP match between two players
   */
  private async createMatch(
    queue1Id: string,
    player1: MatchmakingPlayer,
    queue2Id: string,
    player2: MatchmakingPlayer
  ): Promise<string> {
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const batch = writeBatch(db);

    // Create match document
    const match: PvPMatch = {
      id: matchId,
      player1Id: player1.userId,
      player2Id: player2.userId,
      player1Name: player1.userName,
      player2Name: player2.userName,
      player1DeckId: player1.deckId,
      player2DeckId: player2.deckId,
      status: 'waiting_for_players',
      createdAt: Date.now(),
      currentTurn: 0,
      currentPlayerId: player1.userId, // Player 1 starts
      lastActivityAt: Date.now(),
      actionHistory: [],
    };

    batch.set(doc(db, COLLECTIONS.MATCHES, matchId), match);

    // Update queue entries
    batch.update(doc(db, COLLECTIONS.MATCHMAKING_QUEUE, queue1Id), {
      status: 'matched',
      matchId,
      updatedAt: Date.now(),
    });

    batch.update(doc(db, COLLECTIONS.MATCHMAKING_QUEUE, queue2Id), {
      status: 'matched',
      matchId,
      updatedAt: Date.now(),
    });

    await batch.commit();

    // Clean up queue entries after a delay
    setTimeout(() => {
      deleteDoc(doc(db, COLLECTIONS.MATCHMAKING_QUEUE, queue1Id));
      deleteDoc(doc(db, COLLECTIONS.MATCHMAKING_QUEUE, queue2Id));
    }, 10000);

    return matchId;
  }

  /**
   * Listen to queue status changes
   */
  subscribeToQueue(queueId: string, callback: (queue: MatchmakingQueue | null) => void) {
    return onSnapshot(
      doc(db, COLLECTIONS.MATCHMAKING_QUEUE, queueId),
      (snapshot) => {
        if (snapshot.exists()) {
          callback(snapshot.data() as MatchmakingQueue);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error subscribing to queue:', error);
        callback(null);
      }
    );
  }

  // ==================== INVITATIONS ====================

  /**
   * Send a PvP invitation to another player
   */
  async sendInvitation(
    toUserId: string,
    toUserName: string,
    deckId: string
  ): Promise<string> {
    const userId = auth.currentUser?.uid;
    const userName = auth.currentUser?.displayName || 'Anonymous';

    if (!userId) throw new Error('User not authenticated');
    if (userId === toUserId) throw new Error('Cannot invite yourself');

    const invitationId = `invite_${userId}_${toUserId}_${Date.now()}`;
    const invitation: PvPInvitation = {
      id: invitationId,
      fromUserId: userId,
      fromUserName: userName,
      toUserId,
      toUserName,
      deckId,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + PVP_CONSTANTS.INVITATION_TIMEOUT,
    };

    await setDoc(doc(db, COLLECTIONS.INVITATIONS, invitationId), invitation);
    return invitationId;
  }

  /**
   * Accept a PvP invitation
   */
  async acceptInvitation(invitationId: string, accepterDeckId: string): Promise<string> {
    const inviteDoc = await getDoc(doc(db, COLLECTIONS.INVITATIONS, invitationId));
    if (!inviteDoc.exists()) throw new Error('Invitation not found');

    const invitation = inviteDoc.data() as PvPInvitation;
    if (invitation.status !== 'pending') throw new Error('Invitation is no longer valid');
    if (Date.now() > invitation.expiresAt) throw new Error('Invitation has expired');

    const userId = auth.currentUser?.uid;
    if (userId !== invitation.toUserId) throw new Error('Not authorized to accept this invitation');

    // Create match
    const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const match: PvPMatch = {
      id: matchId,
      player1Id: invitation.fromUserId,
      player2Id: invitation.toUserId,
      player1Name: invitation.fromUserName,
      player2Name: invitation.toUserName,
      player1DeckId: invitation.deckId,
      player2DeckId: accepterDeckId,
      status: 'waiting_for_players',
      createdAt: Date.now(),
      currentTurn: 0,
      currentPlayerId: invitation.fromUserId,
      lastActivityAt: Date.now(),
      actionHistory: [],
    };

    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.MATCHES, matchId), match);
    batch.update(doc(db, COLLECTIONS.INVITATIONS, invitationId), {
      status: 'accepted',
      matchId,
    });

    await batch.commit();
    return matchId;
  }

  /**
   * Decline a PvP invitation
   */
  async declineInvitation(invitationId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.INVITATIONS, invitationId), {
      status: 'declined',
    });
  }

  /**
   * Cancel a sent invitation
   */
  async cancelInvitation(invitationId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.INVITATIONS, invitationId), {
      status: 'cancelled',
    });
  }

  /**
   * Get invitations for current user
   */
  async getReceivedInvitations(): Promise<PvPInvitation[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.INVITATIONS),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const invitations: PvPInvitation[] = [];

    snapshot.forEach((doc) => {
      const invite = doc.data() as PvPInvitation;
      // Filter out expired invitations
      if (Date.now() <= invite.expiresAt) {
        invitations.push(invite);
      } else {
        // Mark as expired
        updateDoc(doc.ref, { status: 'expired' });
      }
    });

    return invitations;
  }

  /**
   * Get sent invitations
   */
  async getSentInvitations(): Promise<PvPInvitation[]> {
    const userId = auth.currentUser?.uid;
    if (!userId) return [];

    const q = query(
      collection(db, COLLECTIONS.INVITATIONS),
      where('fromUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const invitations: PvPInvitation[] = [];

    snapshot.forEach((doc) => {
      invitations.push(doc.data() as PvPInvitation);
    });

    return invitations;
  }

  /**
   * Subscribe to invitations for current user
   */
  subscribeToInvitations(callback: (invitations: PvPInvitation[]) => void) {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, COLLECTIONS.INVITATIONS),
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const invitations: PvPInvitation[] = [];
      snapshot.forEach((doc) => {
        const invite = doc.data() as PvPInvitation;
        if (Date.now() <= invite.expiresAt) {
          invitations.push(invite);
        }
      });
      callback(invitations);
    });
  }

  // ==================== STATS ====================

  /**
   * Get player stats
   */
  async getPlayerStats(userId: string): Promise<PvPStats | null> {
    const statsDoc = await getDoc(doc(db, COLLECTIONS.STATS, userId));
    if (!statsDoc.exists()) {
      // Create initial stats
      const initialStats: PvPStats = {
        userId,
        totalMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        elo: PVP_CONSTANTS.INITIAL_ELO,
        currentStreak: 0,
        longestWinStreak: 0,
        totalPlayTime: 0,
      };
      await setDoc(doc(db, COLLECTIONS.STATS, userId), initialStats);
      return initialStats;
    }
    return statsDoc.data() as PvPStats;
  }

  /**
   * Update player stats after a match
   */
  async updatePlayerStats(matchResult: PvPMatchResult): Promise<void> {
    const batch = writeBatch(db);

    // Calculate ELO changes
    const winnerStats = await this.getPlayerStats(matchResult.winnerId);
    const loserStats = await this.getPlayerStats(matchResult.loserId);

    if (!winnerStats || !loserStats) return;

    const eloChange = this.calculateEloChange(
      winnerStats.elo,
      loserStats.elo,
      true
    );

    // Update winner stats
    const newWinnerStats: PvPStats = {
      ...winnerStats,
      totalMatches: winnerStats.totalMatches + 1,
      wins: winnerStats.wins + 1,
      winRate: ((winnerStats.wins + 1) / (winnerStats.totalMatches + 1)) * 100,
      elo: winnerStats.elo + eloChange,
      currentStreak: winnerStats.currentStreak >= 0 ? winnerStats.currentStreak + 1 : 1,
      longestWinStreak: Math.max(
        winnerStats.longestWinStreak,
        winnerStats.currentStreak >= 0 ? winnerStats.currentStreak + 1 : 1
      ),
      totalPlayTime: winnerStats.totalPlayTime + matchResult.duration,
      lastMatchAt: matchResult.timestamp,
    };

    // Update loser stats
    const newLoserStats: PvPStats = {
      ...loserStats,
      totalMatches: loserStats.totalMatches + 1,
      losses: loserStats.losses + 1,
      winRate: (loserStats.wins / (loserStats.totalMatches + 1)) * 100,
      elo: Math.max(0, loserStats.elo - eloChange),
      currentStreak: loserStats.currentStreak <= 0 ? loserStats.currentStreak - 1 : -1,
      totalPlayTime: loserStats.totalPlayTime + matchResult.duration,
      lastMatchAt: matchResult.timestamp,
    };

    batch.set(doc(db, COLLECTIONS.STATS, matchResult.winnerId), newWinnerStats);
    batch.set(doc(db, COLLECTIONS.STATS, matchResult.loserId), newLoserStats);
    batch.set(doc(db, COLLECTIONS.MATCH_RESULTS, matchResult.matchId), matchResult);

    await batch.commit();
  }

  /**
   * Calculate ELO rating change
   */
  private calculateEloChange(
    winnerElo: number,
    loserElo: number,
    isWinner: boolean
  ): number {
    const expectedScore = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const actualScore = isWinner ? 1 : 0;
    return Math.round(PVP_CONSTANTS.ELO_K_FACTOR * (actualScore - expectedScore));
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limitCount: number = 100): Promise<PvPStats[]> {
    const q = query(
      collection(db, COLLECTIONS.STATS),
      orderBy('elo', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const leaderboard: PvPStats[] = [];

    snapshot.forEach((doc) => {
      leaderboard.push(doc.data() as PvPStats);
    });

    return leaderboard;
  }
}

export default new PvPMatchmakingService();
