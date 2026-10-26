import type { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  Body,
  Divider,
  H3,
  IOButton,
  IOVisualCostants,
  ListItemInfo,
  ListItemRadio,
  useIOToast,
  VSpacer,
} from "@pagopa/io-app-design-system";
import React, { useEffect, useState } from "react";
import { Linking, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";

import { UriInput } from "../../components/eudi/UriInput";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import { useEudiCredentialStatus } from "../../hooks/useEudiCredentialStatus";
import { useEudiParsedCredential } from "../../hooks/useEudiParsedCredential";
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
import {
  EUDI_PRESENTATION_REQUEST_SCHEMES,
  getCardStatus,
  getFormatLabel,
} from "../../utils/eudi";

type Props = NativeStackScreenProps<MainStackNavParamList, "EudiPresentation">;

/**
 * EUDI Wallet remote presentation screen.
 * The presentation starts from a request, either scanned from a QR code, pasted as URI or received
 * as deep link. The requested credentials are presented only with the consent of the user.
 */
/* eslint-disable max-lines-per-function */
export const EudiPresentationScreen = ({ navigation, route }: Props) => {
  const dispatch = useAppDispatch();
  const toast = useIOToast();
  const { completionStatus, request, response, startStatus, uri } =
    useAppSelector(selectEudiPresentationState);
  const [requestUri, setRequestUri] = useState("");
  const [consent, setConsent] = useState<boolean>();
  /** Key tag of the credential chosen for each requested credential, by DCQL Credential Query id */
  const [selectedKeyTags, setSelectedKeyTags] = useState<
    Record<string, string>
  >({});
  const deepLinkRequestUri = route.params?.requestUri;

  useDebugInfo({
    eudiPresentationCompletionStatus: completionStatus,
    eudiPresentationRequest: request,
    eudiPresentationResponse: response,
    eudiPresentationStartStatus: startStatus,
    eudiVerifierTrust: request?.verifierTrust,
    eudiVerifierUnregisteredRequests:
      request?.verifierTrust.unregisteredRequests,
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

  // The first candidate is chosen until the user chooses another one
  const getSelectedKeyTag = ({
    candidates,
    id,
  }: Eudi.RemotePresentation.EvaluatedCredentialQuery) =>
    selectedKeyTags[id] ?? candidates[0]?.keyTag;

  const share = () => {
    if (!request) return;
    setConsent(true);
    const credentials = request.credentials.flatMap((credentialQuery) =>
      credentialQuery.candidates.filter(
        ({ keyTag }) => keyTag === getSelectedKeyTag(credentialQuery),
      ),
    );
    dispatch(completeEudiPresentationThunk({ consent: true, credentials }));
  };

  const refuse = () => {
    setConsent(false);
    dispatch(completeEudiPresentationThunk({ consent: false }));
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
            {request.verifierTrust.unregisteredRequests && (
              <>
                <Divider />
                <ListItemInfo
                  endElement={{
                    componentProps:
                      request.verifierTrust.unregisteredRequests.length === 0
                        ? { text: "Within scope", variant: "success" }
                        : { text: "Overasking", variant: "warning" },
                    type: "badge",
                  }}
                  label="Requested scope"
                  value={
                    request.verifierTrust.unregisteredRequests
                      .map(
                        ({ credentialQueryId, format, path, type }) =>
                          `${credentialQueryId}: ${type ?? format}${path ? ` > ${path.join(".")}` : ""}`,
                      )
                      .join("\n") || "Registered in the WRPRC"
                  }
                />
              </>
            )}
            <VSpacer size={24} />
            <H3>Requested credentials</H3>
            {request.credentials.map((credentialQuery) => (
              <RequestedCredential
                credentialQuery={credentialQuery}
                key={credentialQuery.id}
                onSelect={(keyTag) =>
                  setSelectedKeyTags((keyTags) => ({
                    ...keyTags,
                    [credentialQuery.id]: keyTag,
                  }))
                }
                selectedKeyTag={getSelectedKeyTag(credentialQuery)}
              />
            ))}
            <VSpacer size={24} />
            <IOButton
              disabled={completionStatus.isLoading}
              fullWidth
              label="Share"
              loading={completionStatus.isLoading && consent === true}
              onPress={share}
              variant="solid"
            />
            <VSpacer size={8} />
            <IOButton
              disabled={completionStatus.isLoading}
              fullWidth
              label="Refuse"
              loading={completionStatus.isLoading && consent === false}
              onPress={refuse}
              variant="outline"
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * A credential requested by the verifier, with the purposes of the request. When more wallet
 * credentials satisfy the request, the user chooses the one to present.
 */
const RequestedCredential = ({
  credentialQuery,
  onSelect,
  selectedKeyTag,
}: {
  credentialQuery: Eudi.RemotePresentation.EvaluatedCredentialQuery;
  onSelect: (keyTag: string) => void;
  selectedKeyTag?: string;
}) => {
  const { candidates, purposes } = credentialQuery;
  const descriptions = purposes
    .map(({ description }) => description)
    .filter((description) => !!description);
  return (
    <>
      <VSpacer />
      {descriptions.length > 0 && (
        <>
          <Body>{descriptions.join("\n")}</Body>
          <VSpacer size={8} />
        </>
      )}
      {candidates.length > 1 && (
        <>
          <Body weight="Semibold">
            {`${candidates.length} credentials match, choose the one to share`}
          </Body>
          <VSpacer size={8} />
        </>
      )}
      {candidates.map(({ keyTag }, index) => (
        <React.Fragment key={keyTag}>
          {index > 0 && <Divider />}
          <CandidateCredential
            keyTag={keyTag}
            onPress={() => onSelect(keyTag)}
            selected={keyTag === selectedKeyTag}
          />
        </React.Fragment>
      ))}
    </>
  );
};

/** Radio entry of a wallet credential that satisfies a request, with its format, issuer and status list status */
const CandidateCredential = ({
  keyTag,
  onPress,
  selected,
}: {
  keyTag: string;
  onPress: () => void;
  selected: boolean;
}) => {
  const credential = useAppSelector(selectEudiCredential(keyTag));
  const { parsed } = useEudiParsedCredential(credential);
  const revocation = useEudiCredentialStatus(parsed?.status);
  if (!credential) return null;
  const status = getCardStatus(revocation.status);
  return (
    <ListItemRadio
      description={[
        getFormatLabel(credential.format),
        credential.display?.issuerName ?? credential.issuer,
        status?.label,
      ]
        .filter(Boolean)
        .join(" · ")}
      onPress={onPress}
      selected={selected}
      value={credential.display?.name ?? credential.credentialConfigurationId}
    />
  );
};
