import {
  generateHardwareKey,
  generateHardwareSignatureWithAssertion,
  getAttestation,
  isAttestationServiceAvailable,
  isPlayServicesAvailable,
  prepareIntegrityToken,
  requestIntegrityToken,
} from "@io-app-it-wallet/expo-integrity";
import React, { useState } from "react";
import {
  Button,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from "react-native";
import { v4 as uuid } from "uuid";

export function IntegrityScreen() {
  const [projectNumber, setProjectNumber] = useState("");
  const [challenge, setChallenge] = useState("");
  const [keyTag, setKeyTag] = useState("");
  const [clientData, setClientData] = useState("");
  const [output, setOutput] = useState("Ready");
  const [busy, setBusy] = useState(false);

  const run = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    try {
      const result = await operation();
      setOutput(
        result === undefined ? "Success" : JSON.stringify(result, null, 2),
      );
    } catch (error) {
      setOutput(
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : JSON.stringify(error, null, 2),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text>
        Use a fresh server challenge. Results require server-side verification.
      </Text>
      <Button
        disabled={busy}
        onPress={() =>
          void run(() =>
            Platform.OS === "ios"
              ? isAttestationServiceAvailable()
              : isPlayServicesAvailable(),
          )
        }
        title="Check service availability"
      />
      {Platform.OS === "android" && (
        <>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setProjectNumber}
            placeholder="Google Cloud project number"
            style={styles.input}
            value={projectNumber}
          />
          <Button
            disabled={busy}
            onPress={() => void run(() => prepareIntegrityToken(projectNumber))}
            title="Prepare token provider"
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setClientData}
            placeholder="Request hash (optional)"
            style={styles.input}
            value={clientData}
          />
          <Button
            disabled={busy}
            onPress={() =>
              void run(() => requestIntegrityToken(clientData || undefined))
            }
            title="Request integrity token"
          />
        </>
      )}
      {Platform.OS === "ios" && (
        <Button
          disabled={busy}
          onPress={() =>
            void run(async () => {
              const key = await generateHardwareKey();
              setKeyTag(key);
              return key;
            })
          }
          title="Generate hardware key"
        />
      )}
      <TextInput
        autoCapitalize="none"
        onChangeText={setChallenge}
        placeholder="Challenge"
        style={styles.input}
        value={challenge}
      />
      <TextInput
        autoCapitalize="none"
        onChangeText={setKeyTag}
        placeholder="Hardware key tag"
        style={styles.input}
        value={keyTag}
      />
      {Platform.OS === "android" && (
        <Button
          disabled={busy}
          onPress={() => setKeyTag(uuid())}
          title="Generate new key tag"
        />
      )}
      <Button
        disabled={busy || !challenge || !keyTag}
        onPress={() => void run(() => getAttestation(challenge, keyTag))}
        title="Get attestation"
      />
      {Platform.OS === "ios" && (
        <>
          <TextInput
            autoCapitalize="none"
            onChangeText={setClientData}
            placeholder="Client data"
            style={styles.input}
            value={clientData}
          />
          <Button
            disabled={busy || !keyTag || !clientData}
            onPress={() =>
              void run(() =>
                generateHardwareSignatureWithAssertion(clientData, keyTag),
              )
            }
            title="Generate assertion"
          />
        </>
      )}
      <Text selectable>{busy ? "Working..." : output}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 20 },
  input: { borderColor: "#888", borderWidth: 1, padding: 8 },
});
