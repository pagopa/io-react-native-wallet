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

import { EudiClaimItem } from "../../components/eudi/EudiClaimItem";
import { EudiCredentialCard } from "../../components/eudi/EudiCredentialCard";
import { EudiSharedTransitionBoundary } from "../../components/eudi/EudiSharedTransitionBoundary";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import {
  isPortraitClaim,
  useEudiParsedCredential,
} from "../../hooks/useEudiParsedCredential";
import {
  type EudiCredential,
  eudiCredentialDisplaySet,
  selectEudiCredential,
} from "../../store/reducers/eudi/credentials";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { deleteEudiCredentialThunk } from "../../thunks/eudi/issuance";
import { clipboardSetStringWithFeedback } from "../../utils/clipboard";
import {
  getCredentialTransitionTag,
  getExpiryStatus,
  getFormatLabel,
} from "../../utils/eudi";
import { humanize } from "../../utils/eudiClaims";

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
  const { claims, error, expiresAt, parsed, portrait } =
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
            expiresAt={expiresAt}
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
                  <EudiClaimItem
                    label={
                      labels.has(claim.path.join("/"))
                        ? claim.label
                        : humanize(claim.label)
                    }
                    labels={labels}
                    path={claim.path}
                    value={claim.value}
                  />
                </React.Fragment>
              ))}
              <VSpacer />
            </React.Fragment>
          ))}
          {parsed && <ValiditySection expiresAt={expiresAt} parsed={parsed} />}
          <VSpacer />
          <AccordionItem
            body={<TechnicalDetails credential={credential} parsed={parsed} />}
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

/** Validity of the credential, with its status as shown on the card */
const ValiditySection = ({
  expiresAt,
  parsed,
}: {
  expiresAt?: Date;
  parsed: Eudi.CredentialIssuance.ParsedCredential;
}) => {
  const expiryStatus = expiresAt && getExpiryStatus(expiresAt);
  const { issuedAt, validFrom } = parsed.validity;
  return (
    <>
      <ListItemHeader label="Validity" />
      <ListItemInfo
        endElement={
          expiryStatus && {
            componentProps: {
              text: expiryStatus.label,
              variant: expiryStatus.variant,
            },
            type: "badge",
          }
        }
        label="Valid until"
        value={expiresAt ? expiresAt.toLocaleDateString() : "No expiry"}
      />
      {validFrom && (
        <>
          <Divider />
          <ListItemInfo
            label="Valid from"
            value={validFrom.toLocaleDateString()}
          />
        </>
      )}
      {issuedAt && (
        <>
          <Divider />
          <ListItemInfo label="Issued" value={issuedAt.toLocaleDateString()} />
        </>
      )}
      <VSpacer />
    </>
  );
};

/** Content of the technical details: storage data, issuer signature and status list */
const TechnicalDetails = ({
  credential,
  parsed,
}: {
  credential: EudiCredential;
  parsed?: Eudi.CredentialIssuance.ParsedCredential;
}) => {
  const { algorithm, certificate } = parsed?.signature ?? {};
  return (
    <>
      <ListItemInfo
        label="Credential configuration"
        value={credential.credentialConfigurationId}
      />
      <ListItemInfo label="Format" value={getFormatLabel(credential.format)} />
      <ListItemInfo label="Issuer" value={credential.issuer} />
      <ListItemInfo
        label="Obtained at"
        value={new Date(credential.obtainedAt).toLocaleString()}
      />
      <ListItemInfo label="Key tag" value={credential.keyTag} />
      {algorithm && (
        <ListItemInfo
          label="Signature algorithm"
          value={`${algorithm} (not verified)`}
        />
      )}
      {certificate && (
        <>
          <ListItemInfo
            label="Issuer certificate subject"
            value={certificate.subject}
          />
          <ListItemInfo
            label="Issuer certificate authority"
            value={certificate.issuer}
          />
          <ListItemInfo
            label="Issuer certificate validity"
            value={`${certificate.notBefore.toLocaleDateString()} - ${certificate.notAfter.toLocaleDateString()}`}
          />
        </>
      )}
      {parsed?.status && (
        <ListItemInfo
          label="Status list"
          value={`${parsed.status.uri}\nIndex ${parsed.status.idx}`}
        />
      )}
      <ListItemAction
        icon="copy"
        label="Copy raw credential"
        onPress={() => clipboardSetStringWithFeedback(credential.credential)}
        variant="primary"
      />
    </>
  );
};
