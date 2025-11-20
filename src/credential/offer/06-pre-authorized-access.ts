import { v4 as uuidv4 } from "uuid";
import { Logger, LogLevel } from "../../utils/logging";
import { hasStatusOrThrow } from "../../utils/misc";
import { createDPopToken } from "../../utils/dpop";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import { IoWalletError, UnexpectedStatusCodeError } from "../../utils/errors";
import {
  type CredentialIssuerMetadata,
  type CredentialOffer,
  type TokenResponse,
  TokenResponseSchema,
} from "./types";
import { getAuthenticSourceMetadata } from "./utils";
import type { GrantTypeSelection } from "./04-select-grant-type";

export type AuthorizePreAuthorizedAccessParams = {
  offer: CredentialOffer;
  issuerConf: CredentialIssuerMetadata;
  clientId: string;
  grantSelection: Extract<GrantTypeSelection, { type: "pre-authorized_code" }>;
  txCode?: string;
};

export type AuthorizeAccessContext = {
  appFetch: GlobalFetch["fetch"];
  dpopCryptoContext: CryptoContext;
};

/**
 * Creates and sends the DPoP Proof JWT to be presented with the pre-authorized code
 * to the /token endpoint of the authorization server for requesting the issuance
 * of an access token bound to the public key of the DPoP.
 * @param params Parameters required to authorize pre-authorized access
 * @param params.tokenEndpoint The token endpoint URL of the authorization server
 * @param params.preAuthorizedCode The pre-authorized code received from the credential offer
 * @param params.clientId The client ID of the Wallet Instance
 * @param params.txCode Optional transaction code (PIN) if required by the issuer
 * @param context The context containing dependencies
 * @param context.appFetch fetch api implementation
 * @param context.dpopCryptoContext The DPoP crypto context
 */
export const authorizePreAuthorizedAccess = async (
  params: AuthorizePreAuthorizedAccessParams,
  context: AuthorizeAccessContext
): Promise<TokenResponse> => {
  const { appFetch, dpopCryptoContext } = context;
  const { offer, issuerConf, clientId, grantSelection, txCode } = params;

  const allIdsAreSupported = offer.credential_configuration_ids.every(
    (idFromOffer) => {
      // Check if that ID exists as a key in the metadata's supported object
      return idFromOffer in issuerConf.credential_configurations_supported;
    }
  );

  if (!allIdsAreSupported) {
    throw new IoWalletError("Found unsupported credential configuration IDs");
  }

  // Fetch AS metadata required for authorization request
  const asMetadata = await getAuthenticSourceMetadata(
    offer.credential_issuer,
    appFetch
  );

  const preAuthorizedCode = grantSelection["pre-authorized_code"];

  const requestBody = {
    grant_type: "urn:ietf:params:oauth:grant-type:pre-authorized_code",
    "pre-authorized_code": preAuthorizedCode,
    client_id: clientId,
    ...(txCode && { tx_code: txCode }),
  };

  const body = new URLSearchParams(requestBody as Record<string, string>);

  const dpopProof = await createDPopToken(
    {
      htm: "POST",
      htu: asMetadata.token_endpoint,
      jti: `${uuidv4()}`,
    },
    dpopCryptoContext
  );

  Logger.log(LogLevel.DEBUG, `Token request DPoP: ${dpopProof}`);
  Logger.log(
    LogLevel.INFO,
    `Requesting Pre-Authorized Access Token from: ${asMetadata.token_endpoint}`
  );

  const response = await appFetch(asMetadata.token_endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      DPoP: dpopProof,
    },
    body: body.toString(),
  })
    .then(hasStatusOrThrow(200, UnexpectedStatusCodeError))
    .then((res) => res.json());

  const tokenResult = TokenResponseSchema.safeParse(response);

  if (!tokenResult.success) {
    Logger.log(
      LogLevel.ERROR,
      `Invalid token response: ${tokenResult.error.message}`
    );
    throw new IoWalletError(tokenResult.error.message);
  }

  if (tokenResult.data.token_type.toLowerCase() !== "dpop") {
    Logger.log(
      LogLevel.WARN,
      `Token endpoint did not return a DPoP token (received: ${tokenResult.data.token_type})`
    );
  }

  Logger.log(
    LogLevel.INFO,
    "Pre-Authorized Access Token received successfully."
  );
  return tokenResult.data;
};
