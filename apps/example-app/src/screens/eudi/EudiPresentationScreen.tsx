import {
  Body,
  H3,
  IOButton,
  IOVisualCostants,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { UriInput } from "../../components/eudi/UriInput";

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
        <H3>Scan a presentation request</H3>
        <VSpacer size={8} />
        <Body>Scan the QR code shown by the verifier.</Body>
        <VSpacer />
        <IOButton
          fullWidth
          icon="qrCode"
          label="Scan Presentation Request QR Code"
          onPress={presentCredential}
          variant="solid"
        />
        <VSpacer size={24} />
        <H3>Paste a presentation request</H3>
        <VSpacer size={8} />
        <Body>Paste the presentation request URI.</Body>
        <VSpacer />
        <UriInput
          hint="Accepted schemes: openid4vp://, haip-vp://"
          onChangeText={setRequestUri}
          placeholder="Presentation request URI"
          value={requestUri}
        />
        <VSpacer />
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
