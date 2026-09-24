import React from "react";
import { View } from "react-native";
import Dialog from "react-native-dialog";

interface Props {
  onCancel: () => void;
  onChangePin: (pin: string) => void;
  onConfirm: () => void;
  type: "CAN" | "PIN";
  visible: boolean;
}

export const CiePinDialog = ({
  onCancel,
  onChangePin,
  onConfirm,
  type = "PIN",
  visible,
}: Props) => (
  <View>
    <Dialog.Container
      onBackdropPress={onCancel}
      onRequestClose={onCancel}
      visible={visible}
    >
      <Dialog.Title>CIE {type}</Dialog.Title>
      <Dialog.Description>Enter your CIE {type}</Dialog.Description>
      <Dialog.CodeInput
        autoFocus
        codeLength={type === "PIN" ? 8 : 6}
        onCodeChange={onChangePin}
        secureTextEntry
      />
      <Dialog.Button label="Cancel" onPress={onCancel} />
      <Dialog.Button label="Ok" onPress={onConfirm} />
    </Dialog.Container>
  </View>
);
