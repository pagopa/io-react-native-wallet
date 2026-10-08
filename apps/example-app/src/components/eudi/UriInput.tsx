import {
  BodySmall,
  IOColors,
  useIOTheme,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { StyleSheet, TextInput } from "react-native";

type Props = {
  hint?: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
};

/**
 * Multiline input for long URIs, such as credential offers and presentation requests.
 * The design system TextInput is single line and its border is not rendered in the example app.
 */
export const UriInput = ({ hint, onChangeText, placeholder, value }: Props) => {
  const theme = useIOTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <>
      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        multiline
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={IOColors[theme["textInputLabel-default"]]}
        style={[
          styles.input,
          {
            borderColor: isFocused
              ? IOColors[theme["interactiveElem-default"]]
              : IOColors[theme["textInputBorder-default"]],
            borderWidth: isFocused ? 2 : 1,
            color: IOColors[theme["textInputValue-default"]],
          },
        ]}
        textAlignVertical="top"
        value={value}
      />
      {hint && (
        <>
          <VSpacer size={4} />
          <BodySmall>{hint}</BodySmall>
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  input: {
    borderRadius: 8,
    fontSize: 14,
    maxHeight: 160,
    minHeight: 96,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
