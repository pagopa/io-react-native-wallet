import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  Body,
  Divider,
  H3,
  IOButton,
  IOVisualCostants,
  ListItemHeader,
  ListItemInfo,
  useIOToast,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useEffect, useState } from "react";
import { Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";

import { EudiCredentialCard } from "../../components/eudi/EudiCredentialCard";
import { UriInput } from "../../components/eudi/UriInput";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import { selectEudiCredential } from "../../store/reducers/eudi/credentials";
import {
  eudiPresentationReset,
  selectEudiPresentationState,
} from "../../store/reducers/eudi/presentation";
import { useAppDispatch, useAppSelector } from "../../store/utils";
import {
  completeEudiPresentationThunk,
  startEudiPresentationThunk,
} from "../../thunks/eudi/presentation";
import { EUDI_PRESENTATION_REQUEST_SCHEMES } from "../../utils/eudi";

type Props = NativeStackScreenProps<MainStackNavParamList, "EudiPresentation">;

/**
 * EUDI Wallet remote presentation screen.
 * The presentation starts from a request, either scanned from a QR code, pasted as URI or received
 * as deep link. The requested credentials are presented only with the consent of the user.
 */
export const EudiPresentationScreen = ({ navigation, route }: Props) => {
  const dispatch = useAppDispatch();
  const toast = useIOToast();
  const { completionStatus, request, response, startStatus, uri } =
    useAppSelector(selectEudiPresentationState);
  const [requestUri, setRequestUri] = useState("");
  const [consent, setConsent] = useState<boolean>();
  const deepLinkRequestUri = route.params?.requestUri;

  useDebugInfo({
    eudiPresentationCompletionStatus: completionStatus,
    eudiPresentationRequest: request,
    eudiPresentationResponse: response,
    eudiPresentationStartStatus: startStatus,
    eudiVerifierTrust: request?.verifierTrust,
  });

  useEffect(
    () => () => {
      dispatch(eudiPresentationReset());
    },
    [dispatch],
  );

  // Starts the presentation received as deep link
  useEffect(() => {
    if (deepLinkRequestUri) {
      dispatch(startEudiPresentationThunk({ uri: deepLinkRequestUri }));
    }
  }, [deepLinkRequestUri, dispatch]);

  // Shows the URI of the request being resolved, also when scanned or received as deep link
  useEffect(() => {
    if (uri) setRequestUri(uri);
  }, [uri]);

  useEffect(() => {
    if (startStatus.hasError.status) {
      toast.error(
        startStatus.hasError.error.message ??
          "Unable to verify the presentation request",
      );
    }
  }, [startStatus.hasError, toast]);

  useEffect(() => {
    if (completionStatus.hasError.status) {
      toast.error(
        completionStatus.hasError.error.message ??
          "Unable to send the response to the verifier",
      );
    }
  }, [completionStatus.hasError, toast]);

  // The verifier may continue the flow on its redirect_uri, e.g. in the same-device flow
  useEffect(() => {
    if (!completionStatus.isDone) return;
    toast.success(consent ? "Credentials presented" : "Presentation refused");
    if (response?.redirect_uri) {
      Linking.openURL(response.redirect_uri);
    }
    navigation.goBack();
  }, [completionStatus.isDone, consent, navigation, response, toast]);

  const complete = (userConsent: boolean) => {
    setConsent(userConsent);
    dispatch(completeEudiPresentationThunk({ consent: userConsent }));
  };

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          padding: IOVisualCostants.appMarginDefault,
        }}
      >
        <H3>Scan a presentation request</H3>
        <VSpacer size={8} />
        <Body>Scan the QR code shown by the verifier.</Body>
        <VSpacer />
        <IOButton
          disabled={startStatus.isLoading}
          fullWidth
          icon="qrCode"
          label="Scan Presentation Request QR Code"
          onPress={() =>
            navigation.navigate("QrScanner", { mode: "eudiPresentation" })
          }
          variant="solid"
        />
        <VSpacer size={24} />
        <H3>Paste a presentation request</H3>
        <VSpacer size={8} />
        <Body>
          Paste the presentation request URI, or check the one scanned or
          received as deep link.
        </Body>
        <VSpacer />
        <UriInput
          hint={`Accepted schemes: ${EUDI_PRESENTATION_REQUEST_SCHEMES.map((scheme) => `${scheme}//`).join(", ")}`}
          onChangeText={setRequestUri}
          placeholder="Presentation request URI"
          value={requestUri}
        />
        <VSpacer />
        <IOButton
          disabled={requestUri.length === 0}
          fullWidth
          label="Load presentation request"
          loading={startStatus.isLoading}
          onPress={() =>
            dispatch(startEudiPresentationThunk({ uri: requestUri }))
          }
          variant="outline"
        />
        {request && (
          <>
            <VSpacer size={24} />
            <H3>Verifier</H3>
            <VSpacer size={8} />
            <ListItemInfo
              label="Name"
              value={
                request.requestObject.client_metadata?.client_name ??
                "Not specified"
              }
            />
            <Divider />
            <ListItemInfo
              label="Client Identifier"
              value={request.requestObject.client_id}
            />
            <Divider />
            <ListItemInfo
              label="Response URI"
              value={request.requestObject.response_uri}
            />
            <Divider />
            <ListItemInfo
              endElement={{
                componentProps: request.verifierTrust.isTrusted
                  ? { text: "Trusted", variant: "success" }
                  : { text: "Not trusted", variant: "error" },
                type: "badge",
              }}
              label="Verifier WRPAC/WRPRC"
              value={request.verifierTrust.error?.message ?? "Valid"}
            />
            <VSpacer size={24} />
            <H3>Requested credentials</H3>
            {request.credentials.map((credential) => (
              <RequestedCredential
                credential={credential}
                key={credential.id}
              />
            ))}
            <VSpacer size={24} />
            <IOButton
              disabled={completionStatus.isLoading}
              fullWidth
              label="Share"
              loading={completionStatus.isLoading && consent === true}
              onPress={() => complete(true)}
              variant="solid"
            />
            <VSpacer size={8} />
            <IOButton
              disabled={completionStatus.isLoading}
              fullWidth
              label="Refuse"
              loading={completionStatus.isLoading && consent === false}
              onPress={() => complete(false)}
              variant="outline"
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/** Longest claim value shown in full, longer ones like pictures are truncated */
const MAX_VALUE_LENGTH = 64;

const formatClaimValue = (value: unknown) => {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > MAX_VALUE_LENGTH
    ? `${text.slice(0, MAX_VALUE_LENGTH)}…`
    : text;
};

/**
 * A credential requested by the verifier, with the purposes of the request and the claims to disclose.
 */
const RequestedCredential = ({
  credential,
}: {
  credential: Eudi.RemotePresentation.EvaluatedCredential;
}) => {
  const storedCredential = useAppSelector(
    selectEudiCredential(credential.keyTag),
  );
  const labels = new Map(
    storedCredential?.display?.claims.map(({ label, path }) => [
      path.join("/"),
      label,
    ]),
  );
  const purposes = credential.purposes
    .map(({ description, required }) =>
      [description, required ? "required" : "optional"]
        .filter((part) => !!part)
        .join(", "),
    )
    .join("\n");

  return (
    <>
      <VSpacer />
      {storedCredential && <EudiCredentialCard credential={storedCredential} />}
      <VSpacer size={8} />
      <ListItemInfo label="Purpose" value={purposes} />
      <ListItemHeader label="Claims to disclose" />
      {credential.requiredDisclosures.map(({ name, namespace, value }, i) => (
        <React.Fragment key={`${namespace ?? ""}/${name}`}>
          {i > 0 && <Divider />}
          <ListItemInfo
            label={
              labels.get(namespace ? `${namespace}/${name}` : name) ?? name
            }
            value={formatClaimValue(value)}
          />
        </React.Fragment>
      ))}
    </>
  );
};
