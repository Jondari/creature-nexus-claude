import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/Colors';
import { t } from '@/utils/i18n';

const BOARD_SIZE = 8;
const GEM_TYPES = ['fire', 'water', 'air', 'earth', 'all'] as const;
const { width } = Dimensions.get('window');
const GEM_SIZE = (width - 40) / BOARD_SIZE;

type GemType = typeof GEM_TYPES[number];

interface Gem {
  id: string;
  type: GemType;
  row: number;
  col: number;
  animation: Animated.Value;
  scaleAnimation: Animated.Value;
  marked?: boolean;
}

interface PuzzleBoardProps {
  onMatchDamage: (damage: number, element: string) => void;
  disabled: boolean;
  playerElement: string;
}

const GEM_COLORS: Record<GemType, string[]> = {
  fire: ['#e84b55', '#df8c2b'],
  water: ['#3e7cc9', '#2563eb'],
  air: ['#a78bfa', '#c084fc'],
  earth: ['#16a34a', '#84cc16'],
  all: ['#f59e0b', '#eab308'],
};

const GEM_DAMAGE: Record<GemType, number> = {
  fire: 8,
  water: 8,
  air: 8,
  earth: 8,
  all: 10,
};

export default function PuzzleBoard({ onMatchDamage, disabled, playerElement }: PuzzleBoardProps) {
  const [board, setBoard] = useState<Gem[][]>([]);
  const [selectedGem, setSelectedGem] = useState<{ row: number; col: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const comboAnimation = useRef(new Animated.Value(0)).current;

  // Initialize board
  useEffect(() => {
    initializeBoard();
  }, []);

  const createGem = (row: number, col: number, type?: GemType): Gem => {
    const gemType = type || GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
    return {
      id: `${row}-${col}-${Date.now()}-${Math.random()}`,
      type: gemType,
      row,
      col,
      animation: new Animated.Value(0),
      scaleAnimation: new Animated.Value(1),
    };
  };

  const initializeBoard = () => {
    const newBoard: Gem[][] = [];

    // Create initial board without matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      newBoard[row] = [];
      for (let col = 0; col < BOARD_SIZE; col++) {
        let gem = createGem(row, col);

        // Ensure no initial matches
        while (
          (col >= 2 &&
            newBoard[row][col - 1].type === gem.type &&
            newBoard[row][col - 2].type === gem.type) ||
          (row >= 2 &&
            newBoard[row - 1][col].type === gem.type &&
            newBoard[row - 2][col].type === gem.type)
        ) {
          gem = createGem(row, col);
        }

        newBoard[row][col] = gem;

        // Entrance animation
        Animated.spring(gem.animation, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    }

    setBoard(newBoard);
  };

  const handleGemPress = (row: number, col: number) => {
    if (disabled || isAnimating) return;

    if (!selectedGem) {
      // Select first gem
      setSelectedGem({ row, col });
      animateGemPulse(board[row][col]);
    } else {
      // Check if adjacent
      const rowDiff = Math.abs(selectedGem.row - row);
      const colDiff = Math.abs(selectedGem.col - col);

      if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
        // Adjacent - swap gems
        swapGems(selectedGem.row, selectedGem.col, row, col);
      }

      setSelectedGem(null);
    }
  };

  const animateGemPulse = (gem: Gem) => {
    Animated.sequence([
      Animated.timing(gem.scaleAnimation, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(gem.scaleAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const swapGems = async (row1: number, col1: number, row2: number, col2: number) => {
    setIsAnimating(true);

    const newBoard = board.map((row) => row.map((gem) => ({ ...gem })));

    // Swap
    const temp = newBoard[row1][col1];
    newBoard[row1][col1] = newBoard[row2][col2];
    newBoard[row2][col2] = temp;

    // Update positions
    newBoard[row1][col1].row = row1;
    newBoard[row1][col1].col = col1;
    newBoard[row2][col2].row = row2;
    newBoard[row2][col2].col = col2;

    setBoard(newBoard);

    // Check for matches after a brief delay
    setTimeout(() => {
      checkAndProcessMatches(newBoard);
    }, 300);
  };

  const checkAndProcessMatches = async (currentBoard: Gem[][]) => {
    const matches = findMatches(currentBoard);

    if (matches.length === 0) {
      setIsAnimating(false);
      setComboCount(0);
      return;
    }

    // Calculate damage
    const matchTypes: Record<string, number> = {};
    matches.forEach((match) => {
      matchTypes[match.type] = (matchTypes[match.type] || 0) + 1;
    });

    // Animate matched gems
    matches.forEach((gem) => {
      Animated.sequence([
        Animated.timing(gem.scaleAnimation, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(gem.scaleAnimation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });

    // Update combo
    const newComboCount = comboCount + 1;
    setComboCount(newComboCount);
    animateCombo();

    // Wait for animation
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Calculate total damage
    let totalDamage = 0;
    Object.entries(matchTypes).forEach(([type, count]) => {
      const baseDamage = GEM_DAMAGE[type as GemType] || 8;
      const damage = baseDamage * count;
      totalDamage += damage;
    });

    // Apply combo multiplier
    if (newComboCount > 1) {
      totalDamage = Math.floor(totalDamage * (1 + (newComboCount - 1) * 0.2));
    }

    // Send damage to parent
    const primaryElement = Object.keys(matchTypes)[0];
    onMatchDamage(totalDamage, primaryElement);

    // Remove matched gems and drop new ones
    const newBoard = removeAndDropGems(currentBoard, matches);
    setBoard(newBoard);

    // Check for cascading matches
    setTimeout(() => {
      checkAndProcessMatches(newBoard);
    }, 500);
  };

  const findMatches = (currentBoard: Gem[][]): Gem[] => {
    const matches: Gem[] = [];
    const processed = new Set<string>();

    // Check horizontal matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        const gem1 = currentBoard[row][col];
        const gem2 = currentBoard[row][col + 1];
        const gem3 = currentBoard[row][col + 2];

        if (gem1.type === gem2.type && gem2.type === gem3.type) {
          if (!processed.has(gem1.id)) {
            matches.push(gem1);
            processed.add(gem1.id);
          }
          if (!processed.has(gem2.id)) {
            matches.push(gem2);
            processed.add(gem2.id);
          }
          if (!processed.has(gem3.id)) {
            matches.push(gem3);
            processed.add(gem3.id);
          }
        }
      }
    }

    // Check vertical matches
    for (let col = 0; col < BOARD_SIZE; col++) {
      for (let row = 0; row < BOARD_SIZE - 2; row++) {
        const gem1 = currentBoard[row][col];
        const gem2 = currentBoard[row + 1][col];
        const gem3 = currentBoard[row + 2][col];

        if (gem1.type === gem2.type && gem2.type === gem3.type) {
          if (!processed.has(gem1.id)) {
            matches.push(gem1);
            processed.add(gem1.id);
          }
          if (!processed.has(gem2.id)) {
            matches.push(gem2);
            processed.add(gem2.id);
          }
          if (!processed.has(gem3.id)) {
            matches.push(gem3);
            processed.add(gem3.id);
          }
        }
      }
    }

    return matches;
  };

  const removeAndDropGems = (currentBoard: Gem[][], matches: Gem[]): Gem[][] => {
    const newBoard = currentBoard.map((row) => row.map((gem) => ({ ...gem })));
    const matchIds = new Set(matches.map((m) => m.id));

    // Process each column
    for (let col = 0; col < BOARD_SIZE; col++) {
      // Count empty spaces
      let emptyCount = 0;

      // Drop gems from bottom to top
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        if (matchIds.has(newBoard[row][col].id)) {
          emptyCount++;
        } else if (emptyCount > 0) {
          // Move gem down
          const gem = newBoard[row][col];
          gem.row = row + emptyCount;
          newBoard[row + emptyCount][col] = gem;

          // Animate drop
          Animated.spring(gem.animation, {
            toValue: 1,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
          }).start();
        }
      }

      // Fill top with new gems
      for (let i = 0; i < emptyCount; i++) {
        const newGem = createGem(i, col);
        newBoard[i][col] = newGem;

        // Entrance animation
        Animated.spring(newGem.animation, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    }

    return newBoard;
  };

  const animateCombo = () => {
    comboAnimation.setValue(0);
    Animated.sequence([
      Animated.spring(comboAnimation, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.delay(1000),
      Animated.timing(comboAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      {/* Combo Indicator */}
      {comboCount > 1 && (
        <Animated.View
          style={[
            styles.comboContainer,
            {
              opacity: comboAnimation,
              transform: [
                {
                  scale: comboAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#f59e0b', '#eab308']}
            style={styles.comboGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.comboText}>{t('puzzleQuest.combo', { count: comboCount })}</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Board */}
      <View style={styles.board}>
        {board.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((gem, colIndex) => (
              <TouchableOpacity
                key={gem.id}
                onPress={() => handleGemPress(rowIndex, colIndex)}
                disabled={disabled || isAnimating}
                activeOpacity={0.8}
              >
                <Animated.View
                  style={[
                    styles.gemContainer,
                    {
                      opacity: gem.animation,
                      transform: [
                        {
                          scale: Animated.multiply(gem.animation, gem.scaleAnimation),
                        },
                      ],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={GEM_COLORS[gem.type]}
                    style={[
                      styles.gem,
                      selectedGem?.row === rowIndex &&
                        selectedGem?.col === colIndex &&
                        styles.selectedGem,
                      gem.type === playerElement && styles.boostedGem,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={styles.gemInner} />
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Hint Text */}
      <Text style={styles.hintText}>
        {disabled
          ? t('puzzleQuest.enemyTurn')
          : isAnimating
          ? t('puzzleQuest.processing')
          : t('puzzleQuest.matchGems')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  board: {
    backgroundColor: Colors.background.secondary,
    borderRadius: 12,
    padding: 4,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  row: {
    flexDirection: 'row',
  },
  gemContainer: {
    padding: 2,
  },
  gem: {
    width: GEM_SIZE - 8,
    height: GEM_SIZE - 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  gemInner: {
    width: '60%',
    height: '60%',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectedGem: {
    borderWidth: 3,
    borderColor: Colors.accent[400],
  },
  boostedGem: {
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  hintText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
  comboContainer: {
    position: 'absolute',
    top: -60,
    zIndex: 10,
  },
  comboGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  comboText: {
    fontSize: 20,
    fontFamily: 'Poppins-Bold',
    color: Colors.text.primary,
  },
});
