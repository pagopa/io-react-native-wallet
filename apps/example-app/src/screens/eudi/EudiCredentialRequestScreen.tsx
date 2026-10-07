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
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDebugInfo } from "../../hooks/useDebugInfo";
import {
  eudiCredentialOfferReset,
  selectEudiCredentialOfferState,
} from "../../store/reducers/eudi/offer";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import { resolveEudiCredentialOfferThunk } from "../../thunks/eudi/offer";

/**
 * EUDI Wallet credential request screen.
 * Every credential is requested through a credential offer, either scanned from a QR code or pasted as URI.
 */
export const EudiCredentialRequestScreen = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const toast = useIOToast();
  const { asyncStatus, offer } = useAppSelector(selectEudiCredentialOfferState);
  const [offerUri, setOfferUri] = useState("");

  useDebugInfo({
    eudiCredentialOffer: offer,
    eudiCredentialOfferAsyncStatus: asyncStatus,
  });

  useEffect(
    () => () => {
      dispatch(eudiCredentialOfferReset());
    },
    [dispatch],
  );

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
          placeholder="openid-credential-offer://"
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
              label="Offered credentials"
              value={offer.credential_configuration_ids.join("\n")}
            />
            <Divider />
            <ListItemInfo
              label="Grants"
              value={grants.length > 0 ? grants.join("\n") : "Not specified"}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};
