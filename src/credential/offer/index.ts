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
  Errors,
};

export type {
  StartFlow,
  GetCredentialOffer,
  EvaluateIssuerMetadataFromOffer,
  GrantTypeSelection,
};
