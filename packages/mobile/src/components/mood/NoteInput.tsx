import { Text, TextInput, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";

import { colors, cardShadow } from "../../theme/colors";
import { spacing, radii } from "../../theme/spacing";

const DEFAULT_MAX_LENGTH = 500;
const WARNING_THRESHOLD = 0.8;

interface NoteInputProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  maxLength?: number;
}

export function NoteInput({
  value,
  onChange,
  placeholder = "Write about how you're feeling...",
  maxLength = DEFAULT_MAX_LENGTH,
}: NoteInputProps) {
  const borderProgress = useSharedValue(0);
  const charRatio = value.length / maxLength;
  const isNearLimit = charRatio > WARNING_THRESHOLD;

  const handleFocus = () => {
    borderProgress.value = withTiming(1, { duration: 200 });
  };

  const handleBlur = () => {
    borderProgress.value = withTiming(0, { duration: 150 });
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      borderProgress.value,
      [0, 1],
      [colors.borderLight, colors.accent],
    ),
  }));

  return (
    <Animated.View style={[styles.card, cardShadow(), animatedCardStyle]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        multiline
        maxLength={maxLength}
        textAlignVertical="top"
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {value.length > 0 && (
        <Text style={[styles.charCount, isNearLimit && styles.charCountWarning]}>
          {value.length}/{maxLength}
        </Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
  },
  input: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    minHeight: 100,
    padding: 0,
    lineHeight: 22,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    textAlign: "right",
    marginTop: spacing.sm,
  },
  charCountWarning: {
    color: colors.warning,
    fontFamily: "SourceSerif4_600SemiBold",
  },
});
