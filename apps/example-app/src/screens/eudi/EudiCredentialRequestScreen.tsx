import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import {
  Body,
  Divider,
  H3,
  IOButton,
  IOVisualCostants,
  ListItemInfo,
  TextInput,
  useIOToast,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";

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
  const { asyncStatus, offer } = useAppSelector(selectEudiCredentialOfferState);
  const issuanceStatus = useAppSelector(selectEudiCredentialIssuanceStatus);
  const [offerUri, setOfferUri] = useState("");
  const [requestedCredential, setRequestedCredential] = useState<string>();
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
      setOfferUri(deepLinkOfferUri);
      dispatch(resolveEudiCredentialOfferThunk({ uri: deepLinkOfferUri }));
    }
  }, [deepLinkOfferUri, dispatch]);

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

  const grantDetails = offer && Eudi.CredentialOffer.extractGrantDetails(offer);
  const grants = [
    grantDetails?.authorizationCodeGrant && "Authorization code",
    grantDetails?.preAuthorizedCodeGrant &&
      `Pre-authorized code${grantDetails.preAuthorizedCodeGrant.txCode ? " (transaction code required)" : ""}`,
  ].filter((grant) => !!grant);

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
      >
        <H3>Credential offer</H3>
        <VSpacer size={8} />
        <Body>
          Scan the QR code shown by the issuer or paste the credential offer
          URI.
        </Body>
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
        <VSpacer />
        <TextInput
          onChangeText={setOfferUri}
          placeholder="eu-eaa-offer://"
          value={offerUri}
        />
        <VSpacer size={8} />
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
        {offer && (
          <>
            <VSpacer />
            <ListItemInfo label="Issuer" value={offer.credential_issuer} />
            <Divider />
            <ListItemInfo
              label="Grants"
              value={grants.length > 0 ? grants.join("\n") : "Not specified"}
            />
            <VSpacer />
            <H3>Offered credentials</H3>
            {offer.credential_configuration_ids.map((id) => (
              <React.Fragment key={id}>
                <VSpacer size={8} />
                <IOButton
                  disabled={issuanceStatus.isLoading}
                  fullWidth
                  label={`Obtain ${id}`}
                  loading={
                    issuanceStatus.isLoading && requestedCredential === id
                  }
                  onPress={() => {
                    setRequestedCredential(id);
                    dispatch(
                      obtainEudiCredentialThunk({
                        credentialConfigurationId: id,
                        offer,
                      }),
                    );
                  }}
                  variant="solid"
                />
              </React.Fragment>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
