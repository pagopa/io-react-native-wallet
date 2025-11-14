import React from "react";
import { View } from "react-native";
import Dialog from "react-native-dialog";

type Props = {
  type: "PIN" | "CAN";
  visible: boolean;
  onChangePin: (pin: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export const CiePinDialog = ({
  type = "PIN",
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
        <Dialog.Title>CIE {type}</Dialog.Title>
        <Dialog.Description>Enter your CIE {type}</Dialog.Description>
        <Dialog.CodeInput
          codeLength={type === "PIN" ? 8 : 6}
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
