import { Easing } from "react-native";

export const durations = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
  slowest: 700,
} as const;

export const easings = {
  linear: Easing.linear,
  ease: Easing.ease,
  easeIn: Easing.in(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  easeInOut: Easing.inOut(Easing.ease),
  easeInCubic: Easing.bezier(0.32, 0, 0.67, 0),
  easeOutCubic: Easing.bezier(0.33, 1, 0.68, 1),
  easeInOutCubic: Easing.bezier(0.65, 0, 0.35, 1),
  easeOutBack: Easing.bezier(0.34, 1.56, 0.64, 1),
  easeInBack: Easing.bezier(0.36, 0, 0.66, -0.56),
  gentle: Easing.bezier(0.4, 0, 0.2, 1),
  snappy: Easing.bezier(0.2, 0, 0, 1),
} as const;

export const springConfigs = {
  gentle: { tension: 40, friction: 7, useNativeDriver: true },
  bouncy: { tension: 60, friction: 5, useNativeDriver: true },
  snappy: { tension: 100, friction: 8, useNativeDriver: true },
  smooth: { tension: 50, friction: 9, useNativeDriver: true },
  default: { tension: 50, friction: 7, useNativeDriver: true },
} as const;

export const timingConfigs = {
  fadeIn: {
    duration: 250,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
  },
  fadeOut: {
    duration: 150,
    easing: Easing.in(Easing.ease),
    useNativeDriver: true,
  },
  slideIn: {
    duration: 250,
    easing: Easing.bezier(0.33, 1, 0.68, 1),
    useNativeDriver: true,
  },
  slideOut: {
    duration: 150,
    easing: Easing.bezier(0.32, 0, 0.67, 0),
    useNativeDriver: true,
  },
  scale: {
    duration: 150,
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    useNativeDriver: true,
  },
  press: {
    duration: 150,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
  },
} as const;

export const screenTransitions = {
  default: {
    animation: "slide_from_right" as const,
    animationDuration: 250,
  },
  modal: {
    animation: "slide_from_bottom" as const,
    animationDuration: 350,
  },
  fade: {
    animation: "fade" as const,
    animationDuration: 150,
  },
  none: {
    animation: "none" as const,
    animationDuration: 0,
  },
} as const;
