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
import React, { useEffect, useMemo } from "react";
import { ActivityIndicator, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";

import { EudiCredentialCard } from "../../components/eudi/EudiCredentialCard";
import { EudiSharedTransitionBoundary } from "../../components/eudi/EudiSharedTransitionBoundary";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import {
  isPortraitClaim,
  useEudiParsedCredential,
} from "../../hooks/useEudiParsedCredential";
import {
  eudiCredentialDisplaySet,
  selectEudiCredential,
} from "../../store/reducers/eudi/credentials";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { deleteEudiCredentialThunk } from "../../thunks/eudi/issuance";
import { clipboardSetStringWithFeedback } from "../../utils/clipboard";
import { getCredentialTransitionTag, getFormatLabel } from "../../utils/eudi";

type Props = NativeStackScreenProps<
  MainStackNavParamList,
  "EudiCredentialDetail"
>;

/**
 * EUDI Wallet credential detail screen, which shows the claims of an obtained credential
 * with the display names defined by its issuer.
 */
export const EudiCredentialDetailScreen = ({ navigation, route }: Props) => {
  const dispatch = useAppDispatch();
  const credential = useAppSelector(selectEudiCredential(route.params.keyTag));
  const { claims, error, parsed, portrait } =
    useEudiParsedCredential(credential);

  useDebugInfo({ eudiCredential: credential, eudiParsedCredential: parsed });

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

  const name = credential?.display?.name;
  useEffect(() => {
    if (name) navigation.setOptions({ title: name });
  }, [name, navigation]);

  if (!credential) {
    return <Body>Credential not found</Body>;
  }

  // mdoc claims are grouped by namespace, SD-JWT VC claims have no grouping
  const groups = new Map<string, Eudi.CredentialIssuance.DisplayedClaim[]>();
  for (const claim of claims) {
    // The holder picture is shown in the card
    if (portrait && isPortraitClaim(claim)) continue;
    const title =
      credential.format === "mso_mdoc" ? String(claim.path[0]) : "Claims";
    groups.set(title, [...(groups.get(title) ?? []), claim]);
  }

  return (
    <EudiSharedTransitionBoundary>
      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            margin: IOVisualCostants.appMarginDefault,
          }}
        >
          <EudiCredentialCard
            credential={credential}
            portrait={portrait}
            sharedTransitionTag={getCredentialTransitionTag(credential.keyTag)}
          />
          <VSpacer />
          {error && <Body>{error}</Body>}
          {!error && !parsed && <ActivityIndicator />}
          {[...groups].map(([title, items]) => (
            <React.Fragment key={title}>
              <ListItemHeader label={title} />
              {items.map((claim, index) => (
                <React.Fragment key={claim.path.join("/")}>
                  {index > 0 && <Divider />}
                  <ListItemInfo
                    label={
                      labels.has(claim.path.join("/"))
                        ? claim.label
                        : humanize(claim.label)
                    }
                    value={formatClaim(claim.value, claim.path, labels)}
                  />
                </React.Fragment>
              ))}
              <VSpacer />
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
    </EudiSharedTransitionBoundary>
  );
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
