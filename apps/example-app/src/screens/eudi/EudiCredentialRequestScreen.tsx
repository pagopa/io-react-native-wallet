import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import {
  Body,
  BodySmall,
  Divider,
  H3,
  H6,
  IOButton,
  IOVisualCostants,
  ListItemInfo,
  ListItemSwitch,
  useIOToast,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import type { AsyncStatus } from "../../store/types";

import { UriInput } from "../../components/eudi/UriInput";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import {
  eudiCredentialIssuanceReset,
  selectEudiCredentialIssuanceStatus,
} from "../../store/reducers/eudi/credentials";
import {
  eudiCredentialOfferReset,
  selectEudiCredentialOfferState,
} from "../../store/reducers/eudi/offer";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { obtainEudiCredentialThunk } from "../../thunks/eudi/issuance";
import { resolveEudiCredentialOfferThunk } from "../../thunks/eudi/offer";
import { EUDI_CREDENTIAL_OFFER_SCHEMES } from "../../utils/eudi";

type Props = NativeStackScreenProps<
  MainStackNavParamList,
  "EudiCredentialRequest"
>;

/**
 * Shows a toast with the error of an async status, when it has one.
 */
const useErrorToast = (status: AsyncStatus, fallbackMessage: string) => {
  const toast = useIOToast();

  useEffect(() => {
    if (status.hasError.status) {
      toast.error(status.hasError.error.message ?? fallbackMessage);
    }
  }, [fallbackMessage, status.hasError, toast]);
};

/**
 * EUDI Wallet credential request screen.
 * Every credential is requested through a credential offer, either scanned from a QR code, pasted as URI
 * or received as deep link, and obtained with the Issuer-initiated Authorization Code Flow.
 */
export const EudiCredentialRequestScreen = ({ navigation, route }: Props) => {
  const dispatch = useAppDispatch();
  const toast = useIOToast();
  const { asyncStatus, issuerMetadata, offer, uri } = useAppSelector(
    selectEudiCredentialOfferState,
  );
  const issuanceStatus = useAppSelector(selectEudiCredentialIssuanceStatus);
  const [offerUri, setOfferUri] = useState("");
  const [requestedCredential, setRequestedCredential] = useState<string>();
  const [useWalletAttestation, setUseWalletAttestation] = useState(false);
  const [isObtainingAll, setIsObtainingAll] = useState(false);
  const isUnmounted = useRef(false);
  const deepLinkOfferUri = route.params?.offerUri;

  useDebugInfo({
    eudiCredentialIssuanceStatus: issuanceStatus,
    eudiCredentialOffer: offer,
    eudiCredentialOfferAsyncStatus: asyncStatus,
  });

  useEffect(
    () => () => {
      isUnmounted.current = true;
      dispatch(eudiCredentialOfferReset());
      dispatch(eudiCredentialIssuanceReset());
    },
    [dispatch],
  );

  // Resolves the offer received as deep link
  useEffect(() => {
    if (deepLinkOfferUri) {
      dispatch(resolveEudiCredentialOfferThunk({ uri: deepLinkOfferUri }));
    }
  }, [deepLinkOfferUri, dispatch]);

  // Shows the URI of the offer being resolved, also when scanned or received as deep link
  useEffect(() => {
    if (uri) setOfferUri(uri);
  }, [uri]);

  useErrorToast(issuanceStatus, "Unable to obtain the credential");

  // When obtaining all the credentials, waits for the last one
  useEffect(() => {
    if (issuanceStatus.isDone && !isObtainingAll) {
      toast.success("Credential obtained");
      navigation.navigate("EudiCredentials");
    }
  }, [isObtainingAll, issuanceStatus.isDone, navigation, toast]);

  useErrorToast(asyncStatus, "Unable to resolve the credential offer");

  const summary =
    offer && issuerMetadata && getOfferSummary(offer, issuerMetadata);

  const obtainable = offer?.credential_configuration_ids.filter(
    (id) => issuerMetadata?.credential_configurations_supported[id]?.format,
  );

  const obtain = useCallback(
    (credentialConfigurationId: string) => {
      if (!offer) {
        return Promise.resolve(undefined);
      }
      setRequestedCredential(credentialConfigurationId);
      return dispatch(
        obtainEudiCredentialThunk({
          clientAuthentication: useWalletAttestation ? "attestation" : "public",
          credentialConfigurationId,
          offer,
        }),
      );
    },
    [dispatch, offer, useWalletAttestation],
  );

  // Each credential needs its own user authorization, so they are obtained one after the other
  const obtainAll = async () => {
    setIsObtainingAll(true);
    for (const id of obtainable ?? []) {
      const result = await obtain(id);
      if (
        isUnmounted.current ||
        (result && obtainEudiCredentialThunk.rejected.match(result))
      ) {
        break;
      }
    }
    setIsObtainingAll(false);
  };

  const isBusy = issuanceStatus.isLoading || isObtainingAll;

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: IOVisualCostants.appMarginDefault,
        }}
      >
        <H3>Scan a credential offer</H3>
        <VSpacer size={8} />
        <Body>Scan the QR code shown by the issuer.</Body>
        <VSpacer />
        <IOButton
          disabled={asyncStatus.isLoading}
          fullWidth
          icon="qrCode"
          label="Scan Credential Offer QR Code"
          onPress={() =>
            navigation.navigate("QrScanner", { mode: "eudiOffer" })
          }
          variant="solid"
        />
        <VSpacer size={24} />
        <H3>Paste a credential offer</H3>
        <VSpacer size={8} />
        <Body>
          Paste the credential offer URI, or check the one scanned or received
          as deep link.
        </Body>
        <VSpacer />
        <UriInput
          hint={`Accepted schemes: ${EUDI_CREDENTIAL_OFFER_SCHEMES.map((scheme) => `${scheme}//`).join(", ")}`}
          onChangeText={setOfferUri}
          placeholder="Credential offer URI"
          value={offerUri}
        />
        <VSpacer />
        <IOButton
          disabled={offerUri.length === 0}
          fullWidth
          label="Load credential offer"
          loading={asyncStatus.isLoading}
          onPress={() =>
            dispatch(resolveEudiCredentialOfferThunk({ uri: offerUri }))
          }
          variant="outline"
        />
        {offer && issuerMetadata && summary && (
          <>
            <VSpacer size={24} />
            <OfferDetails
              authorizationServer={summary.authorizationServer}
              credentialIssuer={offer.credential_issuer}
              grants={summary.grants}
            />
            <VSpacer />
            <ListItemSwitch
              description="Authenticate to the issuer with the Wallet Attestation. Turn off to authenticate as a public client."
              disabled={isBusy}
              label="Use Wallet Attestation"
              onSwitchValueChange={setUseWalletAttestation}
              value={useWalletAttestation}
            />
            <VSpacer />
            <H3>Offered credentials</H3>
            {obtainable && obtainable.length > 1 && (
              <>
                <VSpacer size={8} />
                <IOButton
                  disabled={isBusy}
                  fullWidth
                  label={`Obtain all (${obtainable.length})`}
                  loading={isObtainingAll}
                  onPress={obtainAll}
                  variant="outline"
                />
              </>
            )}
            {offer.credential_configuration_ids.map((id, index) => (
              <OfferedCredential
                credentialConfigurationId={id}
                disabled={isBusy}
                isFirst={index === 0}
                issuerMetadata={issuerMetadata}
                key={id}
                loading={issuanceStatus.isLoading && requestedCredential === id}
                onObtain={() => obtain(id)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

type OfferDetailsProps = {
  authorizationServer: string;
  credentialIssuer: string;
  grants: string;
};

/**
 * The Credential Issuer, Authorization Server and grants of a credential offer.
 */
const OfferDetails = ({
  authorizationServer,
  credentialIssuer,
  grants,
}: OfferDetailsProps) => (
  <>
    <H3>Offer details</H3>
    <VSpacer size={8} />
    <ListItemInfo label="Credential Issuer" value={credentialIssuer} />
    <Divider />
    <ListItemInfo label="Authorization Server" value={authorizationServer} />
    <Divider />
    <ListItemInfo label="Grants" value={grants} />
  </>
);

/**
 * Summarizes the grants and the Authorization Server of a credential offer.
 */
const getOfferSummary = (
  offer: Eudi.CredentialOffer.CredentialOffer,
  issuerMetadata: Eudi.CredentialIssuance.CredentialIssuerMetadata,
) => {
  const { authorizationCodeGrant, preAuthorizedCodeGrant } =
    Eudi.CredentialOffer.extractGrantDetails(offer);
  const txCode = preAuthorizedCodeGrant?.txCode;
  const txCodeDetails =
    txCode &&
    [
      txCode.inputMode ?? "numeric",
      txCode.length && `${txCode.length} characters`,
      txCode.description,
    ]
      .filter((detail) => !!detail)
      .join(", ");

  const grants = [
    authorizationCodeGrant &&
      `Authorization code${authorizationCodeGrant.issuerState ? ", with issuer state" : ""}`,
    preAuthorizedCodeGrant &&
      `Pre-authorized code${txCodeDetails ? `, transaction code required (${txCodeDetails})` : ""}`,
  ].filter((grant) => !!grant);

  return {
    authorizationServer:
      authorizationCodeGrant?.authorizationServer ??
      preAuthorizedCodeGrant?.authorizationServer ??
      issuerMetadata.authorization_servers?.[0] ??
      offer.credential_issuer,
    grants: grants.length > 0 ? grants.join("\n") : "Not specified",
  };
};

type OfferedCredentialProps = {
  credentialConfigurationId: string;
  disabled: boolean;
  isFirst: boolean;
  issuerMetadata: Eudi.CredentialIssuance.CredentialIssuerMetadata;
  loading: boolean;
  onObtain: () => void;
};

/**
 * An offered credential, named as defined by the Credential Issuer Metadata, with its configuration ID and the button to obtain it.
 */
const OfferedCredential = ({
  credentialConfigurationId,
  disabled,
  isFirst,
  issuerMetadata,
  loading,
  onObtain,
}: OfferedCredentialProps) => {
  const display = Eudi.CredentialIssuance.getCredentialDisplay(
    issuerMetadata,
    credentialConfigurationId,
  );
  const format =
    issuerMetadata.credential_configurations_supported[
      credentialConfigurationId
    ]?.format;

  return (
    <>
      {isFirst ? <VSpacer size={8} /> : <Divider />}
      <VSpacer size={8} />
      <H6>{display.name}</H6>
      <BodySmall color="grey-700">
        {format
          ? `${credentialConfigurationId} · ${format}`
          : `${credentialConfigurationId} is not supported by the issuer`}
      </BodySmall>
      <VSpacer size={8} />
      <IOButton
        disabled={disabled || !format}
        fullWidth
        label="Obtain"
        loading={loading}
        onPress={onObtain}
        variant="solid"
      />
      <VSpacer size={8} />
    </>
  );
};
