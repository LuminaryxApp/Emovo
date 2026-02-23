import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";

import { useTheme } from "../../theme/ThemeContext";
import { spacing, radii } from "../../theme/spacing";
import { typography } from "../../theme/typography";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  secureTextEntry?: boolean;
  multiline?: boolean;
  maxLength?: number;
  keyboardType?: TextInputProps["keyboardType"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  editable?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  numberOfLines?: number;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  autoFocus?: boolean;
}

// ---------------------------------------------------------------------------
// Animated wrapper for border
// ---------------------------------------------------------------------------

const AnimatedView = Animated.createAnimatedComponent(View);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  secureTextEntry = false,
  multiline = false,
  maxLength,
  keyboardType,
  autoCapitalize,
  editable = true,
  style,
  testID,
  numberOfLines,
  returnKeyType,
  onSubmitEditing,
  autoFocus,
}: InputProps) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useSharedValue(0);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    focusAnim.value = withTiming(1, { duration: 200 });
  }, [focusAnim]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    focusAnim.value = withTiming(0, { duration: 200 });
  }, [focusAnim]);

  const hasError = !!error;

  const animatedBorderStyle = useAnimatedStyle(() => {
    if (hasError) {
      return { borderColor: colors.error };
    }

    const borderColor = interpolateColor(focusAnim.value, [0, 1], [colors.border, colors.accent]);

    return { borderColor };
  });

  const _borderColor = hasError ? colors.error : isFocused ? colors.accent : colors.border;

  return (
    <View style={[styles.container, style]}>
      {/* Label */}
      {label && (
        <Text style={[styles.label, { color: colors.text }, hasError && { color: colors.error }]}>
          {label}
        </Text>
      )}

      {/* Input container */}
      <AnimatedView
        style={[
          styles.inputContainer,
          { backgroundColor: colors.inputBackground, borderColor: colors.border },
          multiline && styles.multilineContainer,
          !editable && [styles.disabledContainer, { backgroundColor: colors.borderLight }],
          animatedBorderStyle,
        ]}
      >
        {/* Left icon */}
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={hasError ? colors.error : isFocused ? colors.accent : colors.textSecondary}
            style={styles.leftIcon}
          />
        )}

        {/* Text input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={secureTextEntry}
          multiline={multiline}
          maxLength={maxLength}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          onFocus={handleFocus}
          onBlur={handleBlur}
          testID={testID}
          numberOfLines={numberOfLines}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          autoFocus={autoFocus}
          style={[
            styles.input,
            { color: colors.text },
            multiline && styles.multilineInput,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
          ]}
        />

        {/* Right icon */}
        {rightIcon && (
          <Pressable onPress={onRightIconPress} hitSlop={8} style={styles.rightIconButton}>
            <Ionicons
              name={rightIcon}
              size={20}
              color={hasError ? colors.error : colors.textSecondary}
            />
          </Pressable>
        )}
      </AnimatedView>

      {/* Character count for multiline with maxLength */}
      {multiline && maxLength && (
        <Text style={[styles.charCount, { color: colors.textTertiary }]}>
          {value.length}/{maxLength}
        </Text>
      )}

      {/* Error or hint */}
      {hasError ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : hint ? (
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    fontFamily: "SourceSerif4_600SemiBold",
    fontWeight: "600",
    marginBottom: spacing.xs + 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radii.md,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  multilineContainer: {
    alignItems: "flex-start",
    minHeight: 100,
    paddingVertical: spacing.sm,
  },
  disabledContainer: {
    opacity: 0.6,
  },
  leftIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    paddingVertical: spacing.sm,
  },
  multilineInput: {
    textAlignVertical: "top",
    minHeight: 80,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  rightIconButton: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
  charCount: {
    ...typography.small,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.xs + 2,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.small,
  },
  hintText: {
    ...typography.small,
    marginTop: spacing.xs + 2,
  },
});
