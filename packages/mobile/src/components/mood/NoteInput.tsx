import { MAX_NOTE_LENGTH } from "@emovo/shared";
import { useState } from "react";
import { View, Text, TextInput, StyleSheet } from "react-native";

import { colors, cardShadow } from "../../theme/colors";

interface NoteInputProps {
  value: string;
  onChangeText: (text: string) => void;
}

export function NoteInput({ value, onChangeText }: NoteInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.card, { borderColor: isFocused ? colors.accent : colors.borderLight }]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder="Add a note about how you're feeling..."
        placeholderTextColor={colors.textTertiary}
        multiline
        maxLength={MAX_NOTE_LENGTH}
        textAlignVertical="top"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {value.length > 0 && (
        <Text style={styles.charCount}>
          {value.length}/{MAX_NOTE_LENGTH}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: 16,
    ...cardShadow(),
  },
  input: {
    fontSize: 15,
    fontFamily: "SourceSerif4_400Regular",
    color: colors.text,
    minHeight: 100,
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
