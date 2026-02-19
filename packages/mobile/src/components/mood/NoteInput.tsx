import { MAX_NOTE_LENGTH } from "@emovo/shared";
import { View, Text, TextInput, StyleSheet } from "react-native";

import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

interface NoteInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function NoteInput({ value, onChangeText }: NoteInputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Add a note (optional)</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="What's on your mind?"
        placeholderTextColor={colors.textTertiary}
        multiline
        maxLength={MAX_NOTE_LENGTH}
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>
        {value.length}/{MAX_NOTE_LENGTH}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: 18,
    fontFamily: "SourceSerif4_600SemiBold",
    color: colors.text,
    marginBottom: spacing.md,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    minHeight: 100,
    maxHeight: 160,
  },
  charCount: {
    fontSize: 12,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    textAlign: "right",
    marginTop: spacing.xs,
  },
});
