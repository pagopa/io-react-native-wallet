import { type StartFlow, startFlowFromQR } from "./01-start-flow";
import {
  fetchCredentialOffer,
  type GetCredentialOffer,
} from "./02-fetch-credential-offer";
import {
  evaluateIssuerMetadataFromOffer,
  type EvaluateIssuerMetadataFromOffer,
} from "./03-evaluate-issuer-metadata";
import {
  type GrantTypeSelection,
  selectGrantType,
} from "./04-select-grant-type";
import {
  type AuthorizationResult,
  prepareAuthorization,
} from "./05-prepare-authorization";

import { authorizeAccess } from "./06-authorize-access";
import { obtainCredential } from "./07-obtain-credential";
import { verifyAndParseCredential } from "./08-verify-and-parse-credential";

import * as Errors from "./errors";

export type {
  CredentialOffer,
  Grants,
  AuthorizationCodeGrant,
  PreAuthorizedCodeGrant,
  TransactionCode,
  CredentialIssuerMetadata,
} from "./types";

export {
  startFlowFromQR,
  fetchCredentialOffer,
  evaluateIssuerMetadataFromOffer,
  selectGrantType,
  prepareAuthorization,
  authorizeAccess,
  obtainCredential,
  verifyAndParseCredential,
  Errors,
};

export type {
  StartFlow,
  GetCredentialOffer,
  EvaluateIssuerMetadataFromOffer,
  GrantTypeSelection,
  AuthorizationResult,
};
