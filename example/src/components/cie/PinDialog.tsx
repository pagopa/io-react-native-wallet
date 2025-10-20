import React from "react";
import Dialog from "react-native-dialog";
import { View } from "react-native";

type Props = {
  visible: boolean;
  onChangePin: (pin: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export const PinDialog = ({
  visible,
  onConfirm,
  onCancel,
  onChangePin,
}: Props) => {
  return (
    <View>
      <Dialog.Container
        visible={visible}
        onBackdropPress={onCancel}
        onRequestClose={onCancel}
      >
        <Dialog.Title>CIE Pin</Dialog.Title>
        <Dialog.Description>Enter your CIE pin</Dialog.Description>
        <Dialog.CodeInput
          codeLength={8}
          onCodeChange={onChangePin}
          autoFocus
          secureTextEntry
        />
        <Dialog.Button label="Cancel" onPress={onCancel} />
        <Dialog.Button label="Ok" onPress={onConfirm} />
      </Dialog.Container>
    </View>
  );
};
