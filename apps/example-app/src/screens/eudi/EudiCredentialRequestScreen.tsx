import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import {
  Body,
  Divider,
  H3,
  IOButton,
  IOVisualCostants,
  ListItemInfo,
  ListItemSwitch,
  useIOToast,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";

import { EudiCredentialCard } from "../../components/eudi/EudiCredentialCard";
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
  const deepLinkOfferUri = route.params?.offerUri;

  useDebugInfo({
    eudiCredentialIssuanceStatus: issuanceStatus,
    eudiCredentialOffer: offer,
    eudiCredentialOfferAsyncStatus: asyncStatus,
  });

  useEffect(
    () => () => {
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

  useEffect(() => {
    if (issuanceStatus.hasError.status) {
      toast.error(
        issuanceStatus.hasError.error.message ??
          "Unable to obtain the credential",
      );
    }
  }, [issuanceStatus.hasError, toast]);

  useEffect(() => {
    if (issuanceStatus.isDone) {
      toast.success("Credential obtained");
      navigation.navigate("EudiCredentials");
    }
  }, [issuanceStatus.isDone, navigation, toast]);

  useEffect(() => {
    if (asyncStatus.hasError.status) {
      toast.error(
        asyncStatus.hasError.error.message ??
          "Unable to resolve the credential offer",
      );
    }
  }, [asyncStatus.hasError, toast]);

  const summary =
    offer && issuerMetadata && getOfferSummary(offer, issuerMetadata);

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
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
            <H3>Offer details</H3>
            <VSpacer size={8} />
            <ListItemInfo
              label="Credential Issuer"
              value={offer.credential_issuer}
            />
            <Divider />
            <ListItemInfo
              label="Authorization Server"
              value={summary.authorizationServer}
            />
            <Divider />
            <ListItemInfo label="Grants" value={summary.grants} />
            <VSpacer />
            <ListItemSwitch
              description="Authenticate to the issuer with the Wallet Attestation. Turn off to authenticate as a public client."
              disabled={issuanceStatus.isLoading}
              label="Use Wallet Attestation"
              onSwitchValueChange={setUseWalletAttestation}
              value={useWalletAttestation}
            />
            <VSpacer />
            <H3>Offered credentials</H3>
            {offer.credential_configuration_ids.map((id) => (
              <OfferedCredential
                credentialConfigurationId={id}
                disabled={issuanceStatus.isLoading}
                issuer={offer.credential_issuer}
                issuerMetadata={issuerMetadata}
                key={id}
                loading={issuanceStatus.isLoading && requestedCredential === id}
                onObtain={() => {
                  setRequestedCredential(id);
                  dispatch(
                    obtainEudiCredentialThunk({
                      clientAuthentication: useWalletAttestation
                        ? "attestation"
                        : "public",
                      credentialConfigurationId: id,
                      offer,
                    }),
                  );
                }}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

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
  issuer: string;
  issuerMetadata: Eudi.CredentialIssuance.CredentialIssuerMetadata;
  loading: boolean;
  onObtain: () => void;
};

/**
 * An offered credential, shown as defined by the Credential Issuer Metadata, with the button to obtain it.
 */
const OfferedCredential = ({
  credentialConfigurationId,
  disabled,
  issuer,
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
      <VSpacer />
      {format ? (
        <EudiCredentialCard
          credential={{ credentialConfigurationId, display, format, issuer }}
        />
      ) : (
        <Body>{`${credentialConfigurationId} is not supported by the issuer`}</Body>
      )}
      <VSpacer size={8} />
      <IOButton
        disabled={disabled || !format}
        fullWidth
        label={`Obtain ${display.name}`}
        loading={loading}
        onPress={onObtain}
        variant="solid"
      />
    </>
  );
};
