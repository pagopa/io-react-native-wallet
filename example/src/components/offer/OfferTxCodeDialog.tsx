import React from "react";
import { View } from "react-native";
import Dialog from "react-native-dialog";

type Props = {
  visible: boolean;
  onChangePin: (pin: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export const OfferTxCodeDialog = ({
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
        <Dialog.Title>Offer Tx Code</Dialog.Title>
        <Dialog.Description>Enter the Transaction Code</Dialog.Description>
        <Dialog.CodeInput
          codeLength={5}
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
