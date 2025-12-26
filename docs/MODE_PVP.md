# Mode PvP (Player vs Player) - Documentation

## Vue d'ensemble

Le mode PvP permet aux joueurs de s'affronter en temps réel dans des parties de Creature Nexus TCG. Le système utilise Firebase Firestore pour synchroniser l'état de jeu entre les joueurs et offre plusieurs façons de trouver un adversaire.

---

## Fonctionnalités

### 1. Matchmaking Rapide (Quick Match)

Le système de matchmaking automatique permet de trouver un adversaire rapidement.

**Caractéristiques :**
- Appariement basé sur l'ELO (système de classement)
- Recherche automatique d'adversaires disponibles
- Différence maximale d'ELO : 300 points
- Timeout de recherche : 2 minutes
- Annulation possible à tout moment

**Processus :**
1. Le joueur sélectionne un deck et rejoint la file d'attente
2. Le système recherche un adversaire avec un ELO similaire
3. Une fois trouvé, un match est créé automatiquement
4. Les deux joueurs sont notifiés et la partie commence

### 2. Système d'Invitations

Les joueurs peuvent inviter directement d'autres joueurs à une partie.

**Caractéristiques :**
- Invitations nommées (envoi par ID utilisateur)
- Durée de validité : 5 minutes
- Notification en temps réel des invitations reçues
- Possibilité d'accepter ou de refuser
- Annulation possible par l'expéditeur

**Statuts d'invitation :**
- `pending` : En attente de réponse
- `accepted` : Acceptée (match créé)
- `declined` : Refusée
- `expired` : Expirée (> 5 minutes)
- `cancelled` : Annulée par l'expéditeur

### 3. Système de Classement (ELO)

Chaque joueur possède un classement ELO qui évolue en fonction des victoires et défaites.

**Paramètres :**
- ELO initial : 1200 points
- Facteur K : 32 (sensibilité des changements)
- Calcul basé sur la formule ELO standard

**Formule :**
```
Score attendu = 1 / (1 + 10^((ELO_adversaire - ELO_joueur) / 400))
Changement ELO = K * (Score réel - Score attendu)
```

### 4. Statistiques de Joueur

Le système suit les statistiques suivantes pour chaque joueur :

- **Matches totaux** : Nombre de parties jouées
- **Victoires** : Nombre de victoires
- **Défaites** : Nombre de défaites
- **Taux de victoire** : Pourcentage de victoires
- **ELO** : Classement actuel
- **Série actuelle** : Série de victoires/défaites en cours
- **Plus longue série de victoires** : Record personnel
- **Temps de jeu total** : Durée cumulée des parties

### 5. Gestion de la Connexion

Le système surveille la connexion des joueurs et gère les déconnexions.

**Heartbeat :**
- Intervalle : 5 secondes
- Seuil de déconnexion : 15 secondes sans heartbeat
- Action : Victoire automatique pour l'adversaire connecté

**Timeout de tour :**
- Durée maximale : 90 secondes par tour
- Action : Fin de tour forcée
- Prévention du stalling (ralentissement intentionnel)

---

## Architecture Technique

### Structure des Fichiers

```
types/
  └── pvp.ts                          # Types TypeScript pour PvP

services/
  └── pvpMatchmakingService.ts        # Service de matchmaking Firebase

modules/game/
  └── PvPGameEngine.ts                # Moteur de jeu PvP avec sync Firebase

context/
  └── PvPContext.tsx                  # Context React pour l'état PvP

components/pvp/
  ├── PvPLobby.tsx                    # Interface du lobby
  └── PvPGameBoard.tsx                # Plateau de jeu PvP

app/
  └── pvp.tsx                         # Écran principal PvP
```

### Collections Firebase

#### 1. `pvp_matchmaking_queue`

File d'attente pour le matchmaking.

```typescript
{
  id: string;                          // ID unique de l'entrée
  player: {
    userId: string;
    userName: string;
    deckId: string;
    elo: number;
    enteredAt: number;                 // Timestamp
  };
  status: MatchmakingStatus;           // 'searching' | 'matched' | 'cancelled'
  createdAt: number;
  updatedAt: number;
  matchId?: string;                    // Set quand un match est trouvé
}
```

#### 2. `pvp_matches`

Parties PvP actives et historique.

```typescript
{
  id: string;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  player1DeckId: string;
  player2DeckId: string;
  status: PvPGameStatus;               // 'waiting_for_players' | 'ready' | 'in_progress' | 'completed' | 'abandoned'
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  winnerId?: string;
  currentTurn: number;
  currentPlayerId: string;
  lastActivityAt: number;              // Pour détection de timeout
  gameState?: GameState;               // État de jeu synchronisé
  actionHistory: PvPGameAction[];      // Historique de toutes les actions
}
```

#### 3. `pvp_matches/{matchId}/playerStates/{userId}`

Sous-collection pour l'état de connexion des joueurs.

```typescript
{
  userId: string;
  isConnected: boolean;
  lastHeartbeat: number;
  isReady: boolean;
  hasForfeited: boolean;
}
```

#### 4. `pvp_invitations`

Invitations entre joueurs.

```typescript
{
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  deckId: string;
  status: InvitationStatus;
  createdAt: number;
  expiresAt: number;
  matchId?: string;
}
```

#### 5. `pvp_stats`

Statistiques des joueurs.

```typescript
{
  userId: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  elo: number;
  currentStreak: number;
  longestWinStreak: number;
  totalPlayTime: number;
  lastMatchAt?: number;
}
```

#### 6. `pvp_match_results`

Résultats des matches terminés.

```typescript
{
  matchId: string;
  winnerId: string;
  winnerName: string;
  loserId: string;
  loserName: string;
  winReason: 'points' | 'deck_out' | 'forfeit' | 'timeout' | 'disconnect';
  duration: number;                    // en secondes
  totalTurns: number;
  timestamp: number;
}
```

---

## Flux de Données

### 1. Matchmaking Quick Match

```
Joueur → joinMatchmaking()
    ↓
pvpMatchmakingService.joinQueue()
    ↓
Création entrée dans pvp_matchmaking_queue
    ↓
findMatch() recherche adversaire
    ↓
Si trouvé → createMatch()
    ↓
Création document pvp_matches
    ↓
Mise à jour queue entries (status: 'matched')
    ↓
Joueurs notifiés via subscribeToQueue()
    ↓
Navigation vers PvPGameBoard
```

### 2. Synchronisation du Jeu

```
Action locale → PvPGameEngine.executeAction()
    ↓
Validation locale avec GameEngine
    ↓
Si valide → syncActionToFirebase()
    ↓
Ajout à actionHistory dans Firestore
    ↓
Mise à jour gameState dans Firestore
    ↓
Listener onSnapshot détecte changement
    ↓
Adversaire reçoit action via processNewActions()
    ↓
Exécution locale chez adversaire
    ↓
Mise à jour UI
```

### 3. Gestion des Timeouts

```
setInterval (5 secondes)
    ↓
Vérification lastHeartbeat adversaire
    ↓
Si > 15 secondes → handleOpponentDisconnect()
    ↓
Mise à jour match (status: 'abandoned', winnerId)
    ↓
Notification joueur connecté
```

---

## Constantes PvP

```typescript
export const PVP_CONSTANTS = {
  MATCHMAKING_TIMEOUT: 120000,         // 2 minutes
  TURN_TIMEOUT: 90000,                 // 90 secondes par tour
  INVITATION_TIMEOUT: 300000,          // 5 minutes
  HEARTBEAT_INTERVAL: 5000,            // 5 secondes
  DISCONNECT_THRESHOLD: 15000,         // 15 secondes sans heartbeat
  MAX_ELO_DIFFERENCE: 300,             // Différence ELO max pour matchmaking
  INITIAL_ELO: 1200,                   // ELO de départ
  ELO_K_FACTOR: 32,                    // Facteur K pour calcul ELO
};
```

---

## Règles de Sécurité Firebase

Pour sécuriser le système PvP, ajoutez ces règles Firestore :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Matchmaking queue - Les joueurs peuvent seulement gérer leurs propres entrées
    match /pvp_matchmaking_queue/{queueId} {
      allow read: if true;
      allow create: if request.auth != null
        && request.resource.data.player.userId == request.auth.uid;
      allow update, delete: if request.auth != null
        && resource.data.player.userId == request.auth.uid;
    }

    // Matches - Les joueurs peuvent lire et modifier leurs propres matches
    match /pvp_matches/{matchId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null
        && (resource.data.player1Id == request.auth.uid
        || resource.data.player2Id == request.auth.uid);

      // Player states
      match /playerStates/{userId} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && userId == request.auth.uid;
      }
    }

    // Invitations
    match /pvp_invitations/{invitationId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null
        && request.resource.data.fromUserId == request.auth.uid;
      allow update: if request.auth != null
        && (resource.data.fromUserId == request.auth.uid
        || resource.data.toUserId == request.auth.uid);
    }

    // Stats - Lecture publique, écriture serveur uniquement
    match /pvp_stats/{userId} {
      allow read: if true;
      allow write: if false; // Utilisez Cloud Functions pour mettre à jour
    }

    // Match results - Lecture publique, écriture serveur uniquement
    match /pvp_match_results/{matchId} {
      allow read: if true;
      allow write: if false; // Utilisez Cloud Functions pour mettre à jour
    }
  }
}
```

---

## Guide d'Utilisation

### Pour les Joueurs

#### 1. Lancer une partie rapide

1. Accédez à l'onglet **PvP** dans le menu
2. Sélectionnez un deck actif (si ce n'est pas déjà fait)
3. Cliquez sur **"Find Match"**
4. Attendez qu'un adversaire soit trouvé (max 2 minutes)
5. La partie commence automatiquement

#### 2. Inviter un ami

1. Accédez à l'onglet **PvP**
2. Cliquez sur l'onglet **"Invitations"**
3. *(Future feature)* Entrez l'ID ou le nom d'utilisateur de votre ami
4. Sélectionnez votre deck
5. Envoyez l'invitation
6. Votre ami recevra une notification
7. Une fois acceptée, la partie commence

#### 3. Accepter une invitation

1. Accédez à l'onglet **PvP → Invitations**
2. Vous verrez les invitations reçues
3. Sélectionnez votre deck
4. Cliquez sur **"Accept"**
5. La partie commence

#### 4. Pendant la partie

- **Votre tour** : Vous pouvez jouer des cartes, attaquer, lancer des sorts
- **Tour de l'adversaire** : Attendez et observez les actions de l'adversaire
- **Indicateurs** :
  - 🟢 Icône Wi-Fi verte : Connexion stable
  - 🔴 Icône Wi-Fi rouge : Problème de connexion
  - Banner jaune : Action de l'adversaire
- **Abandon** : Cliquez sur le bouton 🏳️ "Forfeit" pour abandonner

#### 5. Fin de partie

- Victoire ou défaite affichée
- Statistiques mises à jour automatiquement
- ELO recalculé
- Retour au lobby

### Pour les Développeurs

#### 1. Intégrer le mode PvP dans votre UI

```typescript
import { usePvP } from '@/context/PvPContext';

function MyComponent() {
  const { joinMatchmaking, isSearching } = usePvP();

  const handleQuickMatch = async () => {
    await joinMatchmaking('my-deck-id');
  };

  return (
    <button onClick={handleQuickMatch} disabled={isSearching}>
      {isSearching ? 'Searching...' : 'Find Match'}
    </button>
  );
}
```

#### 2. Écouter les invitations

```typescript
const { activeInvitations, acceptInvitation } = usePvP();

// activeInvitations est automatiquement mis à jour en temps réel
```

#### 3. Créer un match personnalisé

```typescript
import pvpMatchmakingService from '@/services/pvpMatchmakingService';

// Envoyer une invitation
const invitationId = await pvpMatchmakingService.sendInvitation(
  toUserId,
  toUserName,
  myDeckId
);

// Accepter une invitation
const matchId = await pvpMatchmakingService.acceptInvitation(
  invitationId,
  myDeckId
);
```

---

## Améliorations Futures

### Court Terme

1. **Système de chat/émotes** pendant les parties
2. **Historique des matches** consultable
3. **Replay system** pour revoir les parties
4. **Filtres de matchmaking** (amis uniquement, région, etc.)
5. **Leaderboard global** avec classement

### Moyen Terme

1. **Mode tournoi** avec brackets
2. **Parties classées vs non-classées**
3. **Saisons compétitives** avec récompenses
4. **Spectateur mode** pour regarder les parties d'autres joueurs
5. **Système de guildes/clans**

### Long Terme

1. **Mode 2v2** (combat en équipe)
2. **Formats de jeu alternatifs** (draft, sealed, etc.)
3. **Événements limités dans le temps**
4. **Système de paris** (cosmétiques, not real money)
5. **Cross-platform tournaments** avec prix

---

## Troubleshooting

### Problème : Le matchmaking ne trouve pas d'adversaire

**Solutions :**
- Attendez plus longtemps (jusqu'à 2 minutes)
- Vérifiez votre connexion Internet
- Élargissez l'écart ELO maximal (future feature)
- Jouez aux heures de pointe pour plus de joueurs en ligne

### Problème : Déconnexion pendant la partie

**Solutions :**
- Le système détecte automatiquement les déconnexions
- Vous avez 15 secondes pour vous reconnecter
- Si vous ne revenez pas, l'adversaire gagne automatiquement
- Vérifiez votre connexion Wi-Fi/cellulaire

### Problème : L'adversaire ne joue pas

**Solutions :**
- Le système force la fin du tour après 90 secondes
- Si l'adversaire ne répond plus du tout, il sera déconnecté après 15s
- Vous obtiendrez la victoire automatiquement

### Problème : Bugs de synchronisation

**Solutions :**
- Rafraîchissez l'application
- Vérifiez que Firebase fonctionne correctement
- Consultez les logs de la console pour plus de détails
- Signalez le bug avec les détails de reproduction

---

## Performance et Optimisation

### Conseils pour Minimiser la Latence

1. **Connexion stable** : Utilisez une connexion Wi-Fi plutôt que cellulaire
2. **Région proche** : Jouez avec des adversaires géographiquement proches
3. **Firestore Indexes** : Assurez-vous que les index sont créés pour les requêtes
4. **Batch Updates** : Le système groupe les mises à jour pour réduire les écritures

### Limites de Scalabilité

- **Matchmaking** : Peut gérer des milliers de joueurs simultanés
- **Matches actifs** : Limité principalement par Firebase Firestore (quotas généreux)
- **Heartbeat** : Une écriture toutes les 5 secondes par joueur actif
- **Actions** : Environ 30-100 actions par partie (très gérable)

---

## Maintenance

### Nettoyage Automatique

Le système nettoie automatiquement :
- Les entrées de queue après match (10 secondes de délai)
- Les invitations expirées (marquées mais pas supprimées)
- Les player states après fin de match

### Nettoyage Manuel Recommandé

Créez une Cloud Function pour :
- Supprimer les matches terminés > 30 jours
- Supprimer les invitations > 7 jours
- Archiver les résultats de matches anciens

---

## Support et Contact

Pour toute question ou problème avec le mode PvP :

- **Issues GitHub** : Ouvrez une issue avec le tag `pvp`
- **Documentation** : Consultez ce fichier
- **Logs** : Activez le mode debug pour voir les détails de synchronisation

---

**Version** : 1.0.0
**Dernière mise à jour** : 2025-12-26
**Auteur** : Claude Code Assistant
