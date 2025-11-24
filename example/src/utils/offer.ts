import { Credential } from "@pagopa/io-react-native-wallet";
import {
  openAuthenticationSession,
  supportsInAppBrowser,
} from "@pagopa/io-react-native-login-utils";
import type {
  CredentialIssuerMetadata,
  CredentialOffer,
  GrantTypeSelection,
} from "../../../src/credential/offer";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";
import type { TokenResponse } from "../../../src/credential/offer/types";

export type AuthorizedFlowInput = {
  clientId: string;
  redirectUri: string;
  offer: CredentialOffer;
  grantSelection: Extract<GrantTypeSelection, { type: "authorization_code" }>;
  issuerConf: CredentialIssuerMetadata;
  context: {
    appFetch?: GlobalFetch["fetch"];
    dpopCryptoContext: CryptoContext;
  };
};

export type PreAuthorizedFlowInput = {
  clientId: string;
  offer: CredentialOffer;
  grantSelection: Extract<GrantTypeSelection, { type: "pre-authorized_code" }>;
  issuerConf: CredentialIssuerMetadata;
  txCode?: string;
  context: {
    appFetch?: GlobalFetch["fetch"];
    dpopCryptoContext: CryptoContext;
  };
};

export type Output = Promise<TokenResponse>;

export const getTokenResponseFromAuthorizedFlow = async ({
  clientId,
  redirectUri,
  offer,
  grantSelection,
  issuerConf,
  context: { appFetch = fetch, dpopCryptoContext },
}: AuthorizedFlowInput): Output => {
  const baseRedirectUri = new URL(redirectUri).protocol.replace(":", "");

  const { authorizationUrl, codeVerifier, tokenEndpoint } =
    await Credential.Offer.prepareAuthorization(
      {
        clientId: clientId,
        redirectUri,
        offer: offer,
        grantSelection,
        issuerConf: issuerConf,
      },
      { appFetch }
    );

  const supportsCustomTabs = await supportsInAppBrowser();
  if (!supportsCustomTabs) {
    throw new Error("Custom tabs are not supported");
  }

  const redirectUrl = await openAuthenticationSession(
    authorizationUrl,
    baseRedirectUri
  );

  const parsedUrl = new URL(redirectUrl);
  const authorizationCode = parsedUrl.searchParams.get("code")!;

  return await Credential.Offer.authorizeAccess(
    {
      tokenEndpoint: tokenEndpoint,
      authorizationCode: authorizationCode,
      redirectUri,
      clientId: clientId,
      codeVerifier: codeVerifier,
    },
    {
      appFetch,
      dpopCryptoContext,
    }
  );
};

export const getTokenResponseFromPreAuthorizedFlow = async ({
  clientId,
  grantSelection,
  issuerConf,
  offer,
  txCode,
  context: { appFetch = fetch, dpopCryptoContext },
}: PreAuthorizedFlowInput): Output => {
  return await Credential.Offer.authorizePreAuthorizedAccess(
    {
      offer,
      issuerConf,
      clientId,
      grantSelection,
      txCode,
    },
    {
      appFetch,
      dpopCryptoContext,
    }
  );
};
