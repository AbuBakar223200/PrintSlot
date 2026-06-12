import React, { useEffect } from 'react';
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * F5 — `Skeleton` primitive. Content-shaped shimmer placeholder (spec §7). Pulses
 * opacity only (transform/opacity budget, §6); static when reduce-motion is on.
 */
export function Skeleton({ width = '100%', height = 12, radius = 8, style }: SkeletonProps) {
  const { tokens, reduceMotion } = useTheme();
  const o = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) {
      o.value = 0.6;
      return;
    }
    o.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(o);
  }, [reduceMotion, o]);

  const anim = useAnimatedStyle(() => ({ opacity: o.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: tokens.skeletonBase },
        anim,
        style,
      ]}
    />
  );
}
