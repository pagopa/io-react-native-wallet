import { requireNativeModule } from 'expo';
import type { Events, EventsPayload } from './iso18013-5/proximity';
import type { AcceptedFields, RequestedDocument } from './types';

type NativeIso18013 = {
  startEngagement(
    certificates: ReadonlyArray<ReadonlyArray<string>>,
    engagement: ReadonlyArray<string>,
    retrieval: ReadonlyArray<string>
  ): Promise<boolean>;
  startEngagement(
    peripheral: boolean,
    central: boolean,
    clearCache: boolean,
    certificates: ReadonlyArray<ReadonlyArray<string>>,
    engagement: ReadonlyArray<string>,
    retrieval: ReadonlyArray<string>
  ): Promise<boolean>;
  close(): Promise<boolean>;
  sendErrorResponse(code: number): Promise<boolean>;
  generateResponse(documents: Array<RequestedDocument>, fields: AcceptedFields): Promise<string>;
  sendResponse(response: string): Promise<boolean>;
  generateOID4VPDeviceResponse(
    clientId: string,
    responseUri: string,
    nonce: string,
    thumbprint: string | null,
    documents: Array<RequestedDocument>,
    fields: AcceptedFields
  ): Promise<string>;
  setHceModalMessage(message: string): void;
  addListener<E extends Events>(
    event: E,
    callback: (data: EventsPayload[E]) => void
  ): { remove(): void };
};

export const IoReactNativeIso18013 =
  requireNativeModule<NativeIso18013>('ExpoIso18013');
