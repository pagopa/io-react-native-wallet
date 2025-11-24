import React, { useCallback, useState } from "react";
import { OfferTxCodeDialog } from "./OfferTxCodeDialog";
import { Alert } from "react-native";

export const useOffer = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [onConfirmCallback, setOnConfirmCallback] = useState<
    (txCode: string) => void
  >(() => {});
  const [txCode, setTxCode] = useState("");

  const handleTxConfirm = () => {
    if (txCode && txCode.length === 5 && /^\d+$/.test(txCode)) {
      setDialogOpen(false);
      onConfirmCallback(txCode);
      setTxCode("");
    } else {
      Alert.alert(`❌ Invalid TX CODE`);
    }
  };

  const handleTxCancel = () => {
    setDialogOpen(false);
    setTxCode("");
  };

  const requestTxCode = useCallback(
    (callback: (txCode: string) => void) => {
      setOnConfirmCallback(() => callback);
      setDialogOpen(true);
    },
    [setOnConfirmCallback, setDialogOpen]
  );

  const component = (
    <OfferTxCodeDialog
      visible={dialogOpen}
      onChangePin={setTxCode}
      onConfirm={handleTxConfirm}
      onCancel={handleTxCancel}
    />
  );

  return {
    requestTxCode,
    component,
  };
};
