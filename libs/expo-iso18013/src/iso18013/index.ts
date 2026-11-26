import { requireNativeModule } from "expo";

import type { Events, EventsPayload } from "./iso18013-5/proximity";
import type { AcceptedFields, RequestedDocument } from "./types";

type NativeIso18013 = {
  addListener<E extends Events>(
    event: E,
    callback: (data: EventsPayload[E]) => void,
  ): { remove(): void };
  close(): Promise<boolean>;
  generateOID4VPDeviceResponse(
    clientId: string,
    responseUri: string,
    nonce: string,
    thumbprint: null | string,
    documents: RequestedDocument[],
    fields: AcceptedFields,
  ): Promise<string>;
  generateResponse(
    documents: RequestedDocument[],
    fields: AcceptedFields,
  ): Promise<string>;
  sendErrorResponse(code: number): Promise<boolean>;
  sendResponse(response: string): Promise<boolean>;
  setHceModalMessage(message: string): void;
  startEngagement(
    certificates: readonly (readonly string[])[],
    engagement: readonly string[],
    retrieval: readonly string[],
  ): Promise<boolean>;
  startEngagement(
    peripheral: boolean,
    central: boolean,
    clearCache: boolean,
    certificates: readonly (readonly string[])[],
    engagement: readonly string[],
    retrieval: readonly string[],
  ): Promise<boolean>;
};

export const IoReactNativeIso18013 =
  requireNativeModule<NativeIso18013>("ExpoIso18013");
