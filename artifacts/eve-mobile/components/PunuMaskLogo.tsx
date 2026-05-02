import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";

interface Props {
  size?: number;
  isListening?: boolean;
  isThinking?: boolean;
  isActive?: boolean;
}

export function PunuMaskLogo({ size = 120, isListening = false, isThinking = false, isActive = false }: Props) {
  const pulse = useSharedValue(0);
  const glow = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.4, { duration: 1000 })
        ),
        -1
      );
    } else if (isThinking) {
      rotate.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        -1
      );
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 400 }),
          withTiming(0, { duration: 400 })
        ),
        -1
      );
      glow.value = withTiming(0.7, { duration: 500 });
    } else if (isActive) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1
      );
      glow.value = withTiming(0.5, { duration: 500 });
      rotate.value = withTiming(0, { duration: 300 });
    } else {
      pulse.value = withTiming(0, { duration: 500 });
      glow.value = withTiming(0, { duration: 500 });
      rotate.value = withTiming(0, { duration: 300 });
    }
  }, [isListening, isThinking, isActive]);

  const maskStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pulse.value, [0, 1], [1, 1.06]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.9, 1]),
  }));

  const outerGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.6]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.3]) }],
  }));

  const innerGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.3]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [1, 1.15]) }],
  }));

  return (
    <View style={[styles.container, { width: size + 60, height: size + 60 }]}>
      <Animated.View
        style={[
          styles.glowOuter,
          { width: size + 50, height: size + 50, borderRadius: (size + 50) / 2 },
          outerGlowStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.glowInner,
          { width: size + 20, height: size + 20, borderRadius: (size + 20) / 2 },
          innerGlowStyle,
        ]}
      />
      <Animated.View style={maskStyle}>
        <Image
          source={require("../assets/images/icon.png")}
          style={{ width: size, height: size, borderRadius: size / 6 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  glowOuter: {
    position: "absolute",
    backgroundColor: "#C9A228",
  },
  glowInner: {
    position: "absolute",
    backgroundColor: "#C9A228",
  },
});
