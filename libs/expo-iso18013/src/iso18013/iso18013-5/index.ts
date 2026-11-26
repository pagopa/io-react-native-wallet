export { type VerifierRequest, parseVerifierRequest } from './request';

export {
  type OnErrorPayload,
  OnErrorPayloadSchema,
  ModuleErrorSchema,
  type ModuleErrorCodes,
  type ModuleError,
} from './error';

export {
  ErrorCode,
  type Events,
  type EventsPayload,
  type EngagementMode,
  type RetrievalMethod,
  addListener,
  startEngagement,
  close,
  generateResponse,
  sendErrorResponse,
  sendResponse,
  setHceModalMessage,
} from './proximity';

export { type RequestedDocument, type AcceptedFields } from '../types';
