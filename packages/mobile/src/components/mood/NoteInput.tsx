import { MAX_NOTE_LENGTH } from "@emovo/shared";
import { View, Text, TextInput, StyleSheet } from "react-native";

import { colors } from "../../theme/colors";

interface NoteInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function NoteInput({ value, onChangeText }: NoteInputProps) {
  return (
    <View style={styles.card}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Add a note about how you're feeling..."
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
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
  },
  input: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    minHeight: 80,
    padding: 0,
  },
  charCount: {
    fontSize: 11,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.textTertiary,
    textAlign: "right",
    marginTop: 8,
  },
});
