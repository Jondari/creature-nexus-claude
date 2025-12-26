import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { playImpactSound } from '../utils/game/soundManager';

interface DamageEffectProps {
  children: React.ReactNode;
  isActive: boolean;
  duration?: number; // Duration in milliseconds, 0 to disable
  onAnimationComplete?: () => void;
}

export function DamageEffect({ 
  children, 
  isActive, 
  duration = 1000, 
  onAnimationComplete 
}: DamageEffectProps) {
  const flashValue = useRef(new Animated.Value(0)).current;
  const shakeValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isActive || duration === 0) {
      return;
    }

    // Play impact sound when damage animation starts
    playImpactSound();

    // Flash animation (red overlay)
    const flashAnimation = Animated.sequence([
      Animated.timing(flashValue, {
        toValue: 0.7,
        duration: duration * 0.1, // Quick flash up
        useNativeDriver: false,
      }),
      Animated.timing(flashValue, {
        toValue: 0,
        duration: duration * 0.3, // Fade out
        useNativeDriver: false,
      }),
      Animated.timing(flashValue, {
        toValue: 0.5,
        duration: duration * 0.1, // Second flash
        useNativeDriver: false,
      }),
      Animated.timing(flashValue, {
        toValue: 0,
        duration: duration * 0.5, // Final fade out
        useNativeDriver: false,
      }),
    ]);

    // Shake animation
    const shakeAnimation = Animated.sequence([
      Animated.timing(shakeValue, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: 5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: -5,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeValue, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]);

    // Run both animations in parallel
    Animated.parallel([flashAnimation, shakeAnimation]).start(() => {
      onAnimationComplete?.();
    });

    return () => {
      flashAnimation.stop();
      shakeAnimation.stop();
      flashValue.setValue(0);
      shakeValue.setValue(0);
    };
  }, [isActive, duration, onAnimationComplete]);

  if (duration === 0) {
    return <>{children}</>;
  }

  const animatedStyle = {
    transform: [
      {
        translateX: shakeValue,
      },
    ],
  };

  const overlayOpacity = flashValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={animatedStyle}>
      {children}
      {isActive && (
        <Animated.View
          style={[
            styles.damageOverlay,
            {
              opacity: overlayOpacity,
              pointerEvents: 'none',
            },
          ]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  damageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF0000',
    borderRadius: 8,
  },
});