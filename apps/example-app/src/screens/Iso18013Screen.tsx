import {
  CBOR,
  COSE,
  ISO18013_5,
  ISO18013_7,
} from "@io-app-it-wallet/expo-iso18013";
import React, { useEffect, useRef, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { z } from "zod";

import { QrCodeImage } from "../components/QrCodeImage";
import { requestBlePermissions } from "../utils/proximity";

const publicKeySchema = z.discriminatedUnion("kty", [
  z.object({
    crv: z.string(),
    kty: z.literal("EC"),
    x: z.string(),
    y: z.string(),
  }),
  z.object({
    alg: z.string(),
    e: z.string(),
    kty: z.literal("RSA"),
    n: z.string(),
  }),
]);
const documentsSchema = z.array(
  z.object({
    alias: z.string(),
    docType: z.string(),
    issuerSignedContent: z.string(),
  }),
);
const fieldsSchema = z.record(
  z.string(),
  z.record(z.string(), z.record(z.string(), z.boolean())),
);

// eslint-disable-next-line max-lines-per-function
export function Iso18013Screen() {
  const [data, setData] = useState("oWFhAQ==");
  const [keyTag, setKeyTag] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [signature, setSignature] = useState("");
  const [clientId, setClientId] = useState("");
  const [responseUri, setResponseUri] = useState("");
  const [nonce, setNonce] = useState("");
  const [thumbprint, setThumbprint] = useState("");
  const [documents, setDocuments] = useState("[]");
  const [fields, setFields] = useState("{}");
  const [result, setResult] = useState("Ready");
  const [qrCode, setQrCode] = useState<string>();
  const [busy, setBusy] = useState(false);
  const subscriptions = useRef<{ remove(): void }[]>([]);
  const engagementStarted = useRef(false);
  const starting = useRef(false);
  const mounted = useRef(true);

  const removeListeners = () => {
    subscriptions.current.forEach((subscription) => subscription.remove());
    subscriptions.current = [];
  };

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      removeListeners();
      if (engagementStarted.current && !starting.current) {
        void ISO18013_5.close().catch((error) =>
          console.error("Could not close ISO engagement", error),
        );
      }
    };
  }, []);

  const run = async (operation: () => Promise<unknown>) => {
    setBusy(true);
    try {
      const value = await operation();
      if (mounted.current)
        setResult(JSON.stringify(value, null, 2) ?? "Success");
    } catch (error) {
      if (mounted.current) {
        setResult(
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : (JSON.stringify(error, null, 2) ?? String(error)),
        );
      } else {
        console.error("ISO operation failed after leaving the screen", error);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const startEngagement = async () => {
    if (engagementStarted.current) {
      throw new Error("Close the existing engagement first");
    }
    if (!(await requestBlePermissions())) {
      throw new Error("Bluetooth permission is required");
    }
    if (!mounted.current) return;
    subscriptions.current.push(
      ISO18013_5.addListener("onQrCodeString", ({ data: qr }) => setQrCode(qr)),
      ISO18013_5.addListener("onDeviceConnecting", () =>
        setResult("Device connecting"),
      ),
      ISO18013_5.addListener("onDeviceConnected", () =>
        setResult("Device connected"),
      ),
      ISO18013_5.addListener("onDocumentRequestReceived", (event) =>
        setResult(JSON.stringify(event, null, 2)),
      ),
      ISO18013_5.addListener("onDeviceDisconnected", () =>
        setResult("Device disconnected"),
      ),
      ISO18013_5.addListener("onError", (event) =>
        setResult(JSON.stringify(event, null, 2) ?? "Engagement error"),
      ),
    );
    engagementStarted.current = true;
    starting.current = true;
    try {
      const result = await ISO18013_5.startEngagement({
        engagementModes: ["qrcode"],
        retrievalMethods: ["ble"],
      });
      if (!mounted.current) {
        await ISO18013_5.close();
        engagementStarted.current = false;
      }
      return result;
    } catch (error) {
      removeListeners();
      engagementStarted.current = false;
      throw error;
    } finally {
      starting.current = false;
    }
  };

  const closeEngagement = async () => {
    await ISO18013_5.close();
    removeListeners();
    engagementStarted.current = false;
    setQrCode(undefined);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <Text>CBOR input or COSE payload (base64/base64url)</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={setData}
        style={styles.input}
        value={data}
      />
      <Button
        disabled={busy}
        onPress={() => void run(() => CBOR.decode(data))}
        title="Decode CBOR"
      />
      <Button
        disabled={busy}
        onPress={() => void run(() => CBOR.decodeDocuments(data))}
        title="Decode documents"
      />
      <Button
        disabled={busy}
        onPress={() => void run(() => CBOR.decodeIssuerSigned(data))}
        title="Decode issuer signed"
      />
      <TextInput
        autoCapitalize="none"
        onChangeText={setKeyTag}
        placeholder="Existing hardware key tag"
        style={styles.input}
        value={keyTag}
      />
      <Button
        disabled={busy || !keyTag}
        onPress={() =>
          void run(async () => {
            const signed = await COSE.sign(data, keyTag);
            setSignature(signed);
            return signed;
          })
        }
        title="Sign COSE"
      />
      <TextInput
        autoCapitalize="none"
        onChangeText={setSignature}
        placeholder="COSE Sign1 (base64)"
        style={styles.input}
        value={signature}
      />
      <TextInput
        autoCapitalize="none"
        multiline
        onChangeText={setPublicKey}
        placeholder="Public JWK (JSON)"
        style={styles.input}
        value={publicKey}
      />
      <Button
        disabled={busy || !signature || !publicKey}
        onPress={() =>
          void run(() =>
            COSE.verify(
              signature,
              publicKeySchema.parse(JSON.parse(publicKey)),
            ),
          )
        }
        title="Verify COSE"
      />
      <Text>ISO 18013-5 QR engagement (BLE)</Text>
      <Button
        disabled={busy}
        onPress={() => void run(startEngagement)}
        title="Start engagement"
      />
      {qrCode && <QrCodeImage value={qrCode} />}
      <Button
        disabled={busy}
        onPress={() => void run(closeEngagement)}
        title="Close engagement"
      />
      <Text>ISO 18013-7 device response</Text>
      <TextInput
        autoCapitalize="none"
        onChangeText={setClientId}
        placeholder="Client ID"
        style={styles.input}
        value={clientId}
      />
      <TextInput
        autoCapitalize="none"
        onChangeText={setResponseUri}
        placeholder="Response URI"
        style={styles.input}
        value={responseUri}
      />
      <TextInput
        autoCapitalize="none"
        onChangeText={setNonce}
        placeholder="Authorization request nonce"
        style={styles.input}
        value={nonce}
      />
      <TextInput
        autoCapitalize="none"
        onChangeText={setThumbprint}
        placeholder="JWK thumbprint (optional)"
        style={styles.input}
        value={thumbprint}
      />
      <TextInput
        autoCapitalize="none"
        multiline
        onChangeText={setDocuments}
        placeholder="Documents (JSON array)"
        style={styles.input}
        value={documents}
      />
      <TextInput
        autoCapitalize="none"
        multiline
        onChangeText={setFields}
        placeholder="Accepted fields (JSON)"
        style={styles.input}
        value={fields}
      />
      <Button
        disabled={busy || !clientId || !responseUri || !nonce}
        onPress={() =>
          void run(() =>
            ISO18013_7.generateOID4VPDeviceResponse(
              clientId,
              responseUri,
              nonce,
              thumbprint || null,
              documentsSchema.parse(JSON.parse(documents)),
              fieldsSchema.parse(JSON.parse(fields)),
            ),
          )
        }
        title="Generate device response"
      />
      <Text selectable>{busy ? "Working..." : result}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, padding: 20 },
  input: { borderColor: "#888", borderWidth: 1, padding: 8 },
});
