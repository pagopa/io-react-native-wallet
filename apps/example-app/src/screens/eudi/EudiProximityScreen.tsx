import { Eudi } from "@io-app-it-wallet/io-react-native-wallet";
import {
  Body,
  Divider,
  H3,
  IOButton,
  IOVisualCostants,
  ListItemInfo,
  useIOToast,
  VSpacer,
} from "@pagopa/io-app-design-system";
import { ISO18013_5 } from "@pagopa/io-react-native-iso18013";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EudiCandidateCredential } from "../../components/eudi/EudiCandidateCredential";
import { QrCodeImage } from "../../components/QrCodeImage";
import { useDebugInfo } from "../../hooks/useDebugInfo";
import { selectEudiCredentials } from "../../store/reducers/eudi/credentials";
import { selectEudiLotes } from "../../store/reducers/eudi/trust";
import { useAppSelector } from "../../store/utils";
import {
  type EventsPayload,
  requestBlePermissions,
} from "../../utils/proximity";

const { addListener, close, ErrorCode, sendErrorResponse } = ISO18013_5;

/**
 * Status of the proximity flow:
 * - STARTING: the BLE permissions are requested and the engagement is started;
 * - STARTED: the QR code is shown to the verifier;
 * - PRESENTING: the verifier requested the documents, the user must decide whether to share them;
 * - SENT: the response has been sent, waiting for the verifier to disconnect;
 * - STOPPED: the flow has been stopped, by the user, the verifier or due to an error.
 */
type ProximityStatus =
  | "PRESENTING"
  | "SENT"
  | "STARTED"
  | "STARTING"
  | "STOPPED";

/**
 * EUDI Wallet proximity presentation screen (ISO 18013-5 with QR code engagement and BLE retrieval),
 * separate from the IT-Wallet one. The verifier is authenticated with the Trust Anchors of the
 * WRPAC Providers LoTE, and the requested `mso_mdoc` credentials are presented only with the consent of the user.
 */
/* eslint-disable max-lines-per-function */
export const EudiProximityScreen = () => {
  const toast = useIOToast();
  const credentials = useAppSelector(selectEudiCredentials);
  const lotes = useAppSelector(selectEudiLotes);
  const [status, setStatus] = useState<ProximityStatus>("STARTING");
  const [qrCode, setQrCode] = useState<string>();
  const [request, setRequest] =
    useState<Eudi.ProximityPresentation.EvaluatedDeviceRequest>();
  const [sharing, setSharing] = useState(false);
  /** Key tag of the credential chosen for each requested document, by docType */
  const [selectedKeyTags, setSelectedKeyTags] = useState<
    Record<string, string>
  >({});
  const listenerSubscriptions = useRef<ReturnType<typeof addListener>[]>([]);
  // The request listener reads the latest credentials without restarting the engagement
  const credentialsRef = useRef(credentials);
  credentialsRef.current = credentials;
  const wrpacLote = lotes.EUWRPACProvidersList;

  useDebugInfo({ eudiProximityRequest: request, eudiProximityStatus: status });

  const closeFlow = useCallback(async () => {
    listenerSubscriptions.current.forEach((subscription) =>
      subscription.remove(),
    );
    listenerSubscriptions.current = [];
    await close().catch((error) =>
      console.error("Error closing the proximity flow", error),
    );
    setQrCode(undefined);
    setRequest(undefined);
    setSelectedKeyTags({});
    setStatus("STOPPED");
  }, []);

  const sendError = useCallback(
    async (message: string) => {
      await sendErrorResponse(ErrorCode.SESSION_TERMINATED).catch((error) =>
        console.error("Error sending the error response", error),
      );
      toast.error(message);
      await closeFlow();
    },
    [closeFlow, toast],
  );

  const onDocumentRequestReceived = useCallback(
    async (payload: EventsPayload["onDocumentRequestReceived"]) => {
      try {
        if (!payload?.data) {
          throw new Error("The request cannot be parsed");
        }
        const { request: deviceRequest } = ISO18013_5.parseVerifierRequest(
          JSON.parse(payload.data),
        );
        setRequest(
          await Eudi.ProximityPresentation.evaluateDeviceRequest(
            deviceRequest,
            credentialsRef.current,
          ),
        );
        setStatus("PRESENTING");
      } catch (error) {
        console.error("Error handling the verifier request", error);
        await sendError(
          error instanceof Error ? error.message : "Invalid verifier request",
        );
      }
    },
    [sendError],
  );

  const onDeviceDisconnected = useCallback(async () => {
    toast.info("Verifier disconnected");
    await closeFlow();
  }, [closeFlow, toast]);

  const onError = useCallback(
    async (payload: EventsPayload["onError"]) => {
      const parsedError = ISO18013_5.ModuleErrorSchema.safeParse(
        payload?.error,
      );
      console.error("Proximity error", parsedError.data ?? payload);
      toast.error("Proximity session error");
      await closeFlow();
    },
    [closeFlow, toast],
  );

  const startFlow = useCallback(async () => {
    setStatus("STARTING");
    if (!(await requestBlePermissions())) {
      toast.error("BLE permissions are needed to proceed");
      setStatus("STOPPED");
      return;
    }
    try {
      listenerSubscriptions.current = [
        addListener("onQrCodeString", ({ data }) => setQrCode(data)),
        addListener("onDocumentRequestReceived", onDocumentRequestReceived),
        addListener("onDeviceDisconnected", onDeviceDisconnected),
        addListener("onError", onError),
      ];
      // Without the WRPAC Providers LoTE the verifier is not authenticated
      await ISO18013_5.startEngagement({
        certificates: wrpacLote
          ? Eudi.ProximityPresentation.getReaderTrustAnchors(wrpacLote)
          : [],
        engagementModes: ["qrcode"],
        retrievalMethods: ["ble"],
      });
      setStatus("STARTED");
    } catch (error) {
      console.error("Error starting the proximity flow", error);
      toast.error("Failed to start the QR code engagement");
      await closeFlow();
    }
  }, [
    closeFlow,
    onDeviceDisconnected,
    onDocumentRequestReceived,
    onError,
    toast,
    wrpacLote,
  ]);

  useEffect(() => {
    startFlow();
    return () => {
      closeFlow();
    };
  }, [closeFlow, startFlow]);

  // The first candidate is chosen until the user chooses another one
  const getSelectedKeyTag = ({
    candidates,
    docType,
  }: Eudi.ProximityPresentation.EvaluatedDocumentRequest) =>
    selectedKeyTags[docType] ?? candidates[0]?.keyTag;

  const share = async () => {
    if (!request) return;
    setSharing(true);
    try {
      await Eudi.ProximityPresentation.sendDeviceResponse(
        request.documents.flatMap((document) =>
          document.candidates.filter(
            ({ keyTag }) => keyTag === getSelectedKeyTag(document),
          ),
        ),
      );
      toast.success("Credentials presented");
      setStatus("SENT");
    } catch (error) {
      console.error("Error sending the response", error);
      toast.error("Unable to send the response to the verifier");
    } finally {
      setSharing(false);
    }
  };

  const verifierName =
    request?.verifier?.organization ?? request?.verifier?.commonName;

  return (
    <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: IOVisualCostants.appMarginDefault,
        }}
      >
        {status === "STARTING" && <Body>Starting the proximity flow</Body>}
        {status === "STARTED" && qrCode && (
          <View style={{ alignItems: "center" }}>
            <Body>Show the QR code to the verifier.</Body>
            <VSpacer />
            <QrCodeImage correctionLevel="L" size={"80%"} value={qrCode} />
          </View>
        )}
        {status === "SENT" && (
          <Body>Response sent, waiting for the verifier to disconnect.</Body>
        )}
        {status === "PRESENTING" && request && (
          <>
            <H3>Verifier</H3>
            <VSpacer size={8} />
            <ListItemInfo
              label="Name"
              value={verifierName ?? "Not specified"}
            />
            {request.verifier?.country && (
              <>
                <Divider />
                <ListItemInfo
                  label="Country"
                  value={request.verifier.country}
                />
              </>
            )}
            <Divider />
            <ListItemInfo
              endElement={{
                componentProps: request.isVerifierAuthenticated
                  ? { text: "Trusted", variant: "success" }
                  : { text: "Not trusted", variant: "error" },
                type: "badge",
              }}
              label="Reader authentication"
              value={
                request.isVerifierAuthenticated
                  ? "Signed with a WRPAC"
                  : "Not signed with a trusted WRPAC"
              }
            />
            <VSpacer size={24} />
            <H3>Requested credentials</H3>
            {request.documents.map((document) => (
              <RequestedDocument
                document={document}
                key={document.docType}
                onSelect={(keyTag) =>
                  setSelectedKeyTags((keyTags) => ({
                    ...keyTags,
                    [document.docType]: keyTag,
                  }))
                }
                selectedKeyTag={getSelectedKeyTag(document)}
              />
            ))}
            <VSpacer size={24} />
            <IOButton
              disabled={sharing}
              fullWidth
              label="Share"
              loading={sharing}
              onPress={share}
              variant="solid"
            />
            <VSpacer size={8} />
            <IOButton
              disabled={sharing}
              fullWidth
              label="Refuse"
              onPress={() => sendError("Presentation refused")}
              variant="outline"
            />
          </>
        )}
        {status === "STOPPED" && (
          <IOButton
            fullWidth
            icon="qrCode"
            label="Generate QR Engagement"
            onPress={startFlow}
            variant="solid"
          />
        )}
        {status === "STARTED" && (
          <>
            <VSpacer size={24} />
            <IOButton
              fullWidth
              label="Close QR Engagement"
              onPress={closeFlow}
              variant="outline"
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * A document requested by the verifier, with the requested data elements. When more wallet
 * credentials satisfy the request, the user chooses the one to present.
 */
const RequestedDocument = ({
  document,
  onSelect,
  selectedKeyTag,
}: {
  document: Eudi.ProximityPresentation.EvaluatedDocumentRequest;
  onSelect: (keyTag: string) => void;
  selectedKeyTag?: string;
}) => {
  const { candidates, docType } = document;
  const selected = candidates.find(({ keyTag }) => keyTag === selectedKeyTag);
  return (
    <>
      <VSpacer />
      <Body weight="Semibold">{docType}</Body>
      <VSpacer size={8} />
      {candidates.length === 0 && (
        <Body>Not available in the wallet, it will not be shared</Body>
      )}
      {candidates.length > 1 && (
        <>
          <Body>
            {`${candidates.length} credentials match, choose the one to share`}
          </Body>
          <VSpacer size={8} />
        </>
      )}
      {candidates.map(({ keyTag }, index) => (
        <React.Fragment key={keyTag}>
          {index > 0 && <Divider />}
          <EudiCandidateCredential
            keyTag={keyTag}
            onPress={() => onSelect(keyTag)}
            selected={keyTag === selectedKeyTag}
          />
        </React.Fragment>
      ))}
      {selected && (
        <Body>
          {selected.requestedClaims
            .map(
              ({ intentToRetain, name, value }) =>
                `${name}${value === undefined ? " (missing)" : ""}${intentToRetain ? " (retained)" : ""}`,
            )
            .join("\n")}
        </Body>
      )}
    </>
  );
};
