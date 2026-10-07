import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import {
  AccordionItem,
  Body,
  Divider,
  IOVisualCostants,
  ListItemAction,
  ListItemHeader,
  ListItemInfo,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";

import { EudiCredentialCard } from "../../components/eudi/EudiCredentialCard";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import {
  eudiCredentialDisplaySet,
  selectEudiCredential,
} from "../../store/reducers/eudi/credentials";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { deleteEudiCredentialThunk } from "../../thunks/eudi/issuance";
import { clipboardSetStringWithFeedback } from "../../utils/clipboard";
import { getFormatLabel } from "../../utils/eudi";

type Props = NativeStackScreenProps<
  MainStackNavParamList,
  "EudiCredentialDetail"
>;

/** Claims holding the holder picture, in mdoc and SD-JWT VC credentials */
const PORTRAIT_CLAIMS = ["portrait", "picture"];

/**
 * EUDI Wallet credential detail screen, which shows the claims of an obtained credential
 * with the display names defined by its issuer.
 */
export const EudiCredentialDetailScreen = ({ navigation, route }: Props) => {
  const dispatch = useAppDispatch();
  const credential = useAppSelector(selectEudiCredential(route.params.keyTag));
  const [parsed, setParsed] =
    useState<Eudi.CredentialIssuance.ParsedCredential>();
  const [error, setError] = useState<string>();

  useDebugInfo({ eudiCredential: credential, eudiParsedCredential: parsed });

  useEffect(() => {
    if (!credential) return;
    Eudi.CredentialIssuance.parseCredential(
      credential.credential,
      credential.format,
    )
      .then(setParsed)
      .catch((e: unknown) => setError(String(e)));
  }, [credential]);

  // Credentials obtained before the display was stored at issuance get it from the issuer metadata
  const hasDisplay = !!credential?.display;
  useEffect(() => {
    if (!credential || hasDisplay) return;
    const { credentialConfigurationId, issuer, keyTag } = credential;
    Eudi.CredentialIssuance.fetchMetadata(issuer)
      .then(({ issuerMetadata }) =>
        dispatch(
          eudiCredentialDisplaySet({
            display: Eudi.CredentialIssuance.getCredentialDisplay(
              issuerMetadata,
              credentialConfigurationId,
            ),
            keyTag,
          }),
        ),
      )
      .catch(() => undefined); // The credential is shown without display
  }, [credential, dispatch, hasDisplay]);

  // Display names of the nested claims, e.g. the parts of an address
  const labels = useMemo(
    () =>
      new Map(
        credential?.display?.claims.map(({ label, path }) => [
          path.join("/"),
          label,
        ]),
      ),
    [credential?.display],
  );

  const claims = useMemo(
    () =>
      parsed && credential
        ? Eudi.CredentialIssuance.getDisplayedClaims(
            parsed.claims,
            credential.format,
            credential.display?.claims,
          )
        : [],
    [credential, parsed],
  );

  if (!credential) {
    return <Body>Credential not found</Body>;
  }

  const isPortrait = (claim: Eudi.CredentialIssuance.DisplayedClaim) =>
    PORTRAIT_CLAIMS.includes(String(claim.path[claim.path.length - 1]));
  const portrait = claims.find(isPortrait);
  const portraitUri = portrait && toImageUri(portrait.value);

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
      >
        <EudiCredentialCard credential={credential} />
        {portraitUri && (
          <>
            <VSpacer size={24} />
            <Image
              accessibilityIgnoresInvertColors
              accessibilityLabel={portrait.label}
              resizeMode="cover"
              source={{ uri: portraitUri }}
              style={styles.portrait}
            />
          </>
        )}
        <VSpacer />
        <ListItemHeader label="Claims" />
        {error && <Body>{error}</Body>}
        {!error && !parsed && <ActivityIndicator />}
        {claims
          .filter((claim) => !(portraitUri && isPortrait(claim)))
          .map((claim) => (
            <React.Fragment key={claim.path.join("/")}>
              <ListItemInfo
                label={
                  labels.has(claim.path.join("/"))
                    ? claim.label
                    : humanize(claim.label)
                }
                value={formatClaim(claim.value, claim.path, labels)}
              />
              <Divider />
            </React.Fragment>
          ))}
        <VSpacer />
        <AccordionItem
          body={
            <>
              <ListItemInfo
                label="Credential configuration"
                value={credential.credentialConfigurationId}
              />
              <ListItemInfo
                label="Format"
                value={getFormatLabel(credential.format)}
              />
              <ListItemInfo label="Issuer" value={credential.issuer} />
              <ListItemInfo
                label="Obtained at"
                value={new Date(credential.obtainedAt).toLocaleString()}
              />
              <ListItemInfo label="Key tag" value={credential.keyTag} />
              <ListItemAction
                icon="copy"
                label="Copy raw credential"
                onPress={() =>
                  clipboardSetStringWithFeedback(credential.credential)
                }
                variant="primary"
              />
            </>
          }
          title="Technical details"
        />
        <VSpacer />
        <ListItemAction
          icon="trashcan"
          label="Delete credential"
          onPress={() =>
            Alert.alert(
              "Delete credential",
              "The credential and its key will be removed from the device.",
              [
                { style: "cancel", text: "Cancel" },
                {
                  onPress: () =>
                    dispatch(deleteEudiCredentialThunk(credential.keyTag))
                      .unwrap()
                      .then(() => navigation.goBack())
                      .catch((e: unknown) =>
                        Alert.alert(
                          "Unable to delete the credential",
                          String(e),
                        ),
                      ),
                  style: "destructive",
                  text: "Delete",
                },
              ],
            )
          }
          variant="danger"
        />
        <VSpacer size={32} />
      </ScrollView>
    </SafeAreaView>
  );
};

/** Encodes binary data, used by mdoc for pictures, as base64 */
const toBase64 = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
};

/** Base64 prefixes of the supported image formats, in base64url (as returned for mdoc) and base64 */
const IMAGE_BASE64_PREFIXES: Record<string, string> = {
  "/9j/": "image/jpeg",
  _9j_: "image/jpeg",
  iVBOR: "image/png",
};

/** Returns a displayable image URI from binary data, a base64(url) string or a data URI */
const toImageUri = (value: unknown) => {
  if (value instanceof Uint8Array) {
    return `data:image/jpeg;base64,${toBase64(value)}`;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  if (value.startsWith("data:image")) {
    return value;
  }
  const mimeType = Object.entries(IMAGE_BASE64_PREFIXES).find(([prefix]) =>
    value.startsWith(prefix),
  )?.[1];
  if (!mimeType) {
    return undefined;
  }
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  return `data:${mimeType};base64,${base64}${padding}`;
};

/** Turns a claim name such as `expiry_date` into a label such as `Expiry date` */
const humanize = (key: string) => {
  const words = key.replace(/[_-]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Formats a date, parsing date-only values in the local timezone to avoid a day shift */
const formatDate = (value: string) => {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      )
    : new Date(value);
  return date.toLocaleDateString();
};

const isDateString = (value: string) =>
  /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:?\d{2})?)?$/.test(value);

/**
 * Formats a claim value, using the display names of its nested claims when available.
 * @param path - The claim path, to look up the display names of the nested claims
 * @param labels - The display names by claim path
 */
const formatClaim = (
  value: unknown,
  path: Eudi.CredentialIssuance.ClaimPath,
  labels: Map<string, string>,
): string => {
  if (value === null || value === undefined) {
    return "-";
  }
  if (value instanceof Uint8Array) {
    return `Binary data, ${value.length} bytes`;
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "string") {
    return isDateString(value) ? formatDate(value) : value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => formatClaim(item, [...path, null], labels))
      .join("\n\n");
  }
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => {
        const itemPath = [...path, key];
        const label = labels.get(itemPath.join("/")) ?? humanize(key);
        return `${label}: ${formatClaim(item, itemPath, labels)}`;
      })
      .join("\n");
  }
  return String(value);
};

const styles = StyleSheet.create({
  portrait: {
    alignSelf: "center",
    aspectRatio: 3 / 4,
    borderRadius: 8,
    width: 120,
  },
});
