import React from "react";
import { View } from "react-native";
import Dialog from "react-native-dialog";

type Props = {
  visible: boolean;
  onChangePin: (pin: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export const CiePinDialog = ({
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
