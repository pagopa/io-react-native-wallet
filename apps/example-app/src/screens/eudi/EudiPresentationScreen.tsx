import {
  Body,
  H3,
  IOButton,
  IOVisualCostants,
  TextInput,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * EUDI Wallet credential presentation screen.
 * The presentation starts from a request, either scanned from a QR code or pasted as URI.
 */
export const EudiPresentationScreen = () => {
  const [requestUri, setRequestUri] = useState("");

  // TODO: present the credentials requested by the verifier
  const presentCredential = () => Alert.alert("Not implemented yet");

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
      >
        <H3>Presentation request</H3>
        <VSpacer size={8} />
        <Body>
          Scan the QR code shown by the verifier or paste the presentation
          request URI.
        </Body>
        <VSpacer />
        <IOButton
          fullWidth
          icon="qrCode"
          label="Scan Presentation Request QR Code"
          onPress={presentCredential}
          variant="solid"
        />
        <VSpacer />
        <TextInput
          onChangeText={setRequestUri}
          placeholder="openid4vp://"
          value={requestUri}
        />
        <VSpacer size={8} />
        <IOButton
          disabled={requestUri.length === 0}
          fullWidth
          label="Present credential"
          onPress={presentCredential}
          variant="outline"
        />
      </ScrollView>
    </SafeAreaView>
  );
};
