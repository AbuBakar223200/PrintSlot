import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

/**
 * F4 — AmbientBackground.
 *
 * The slow, ambient gradient backdrop behind every screen (Fork 6). A base
 * LinearGradient (`bgGradient` tokens) plus two soft tinted "blobs" that drift on
 * a long loop. Per AGENTS §3 + §6 the motion is **transform/opacity only** — we
 * never recompute color stops per frame. Freezes when reduce-motion is on
 * (Fork 13). Mounted once by the `Screen` primitive; content rides on top.
 */
export function AmbientBackground() {
  const { tokens, tones, reduceMotion } = useTheme();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      t.value = 0;
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration: 48000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(t);
  }, [reduceMotion, t]);

  const blobTop = useAnimatedStyle(() => ({
    transform: [
      { translateX: -40 + t.value * 80 },
      { translateY: -30 + t.value * 60 },
      { rotate: `${t.value * 40}deg` },
      { scale: 1 + t.value * 0.12 },
    ],
  }));

  const blobBottom = useAnimatedStyle(() => ({
    transform: [
      { translateX: 40 - t.value * 70 },
      { translateY: 30 - t.value * 50 },
      { rotate: `${-t.value * 36}deg` },
    ],
  }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={tokens.bgGradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.blob, styles.top, blobTop]}>
        <LinearGradient
          colors={[tones.primary.bg, 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Animated.View style={[styles.blob, styles.bottom, blobBottom]}>
        <LinearGradient
          colors={[tones.violet.bg, 'transparent']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    overflow: 'hidden',
  },
  top: { top: -130, left: -110 },
  bottom: { bottom: -120, right: -90 },
});
