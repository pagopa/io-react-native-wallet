import {
  createCryptoContextFor,
  Credential,
} from "@pagopa/io-react-native-wallet";
import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import type { CredentialOfferResult } from "../store/types";
import {
  openAuthenticationSession,
  supportsInAppBrowser,
} from "@pagopa/io-react-native-login-utils";
import { getEnv } from "../utils/environment";
import { selectEnv } from "../store/reducers/environment";
import { DPOP_KEYTAG, regenerateCryptoKey } from "../utils/crypto";
import { v4 as uuidv4 } from "uuid";
import { generate } from "@pagopa/io-react-native-crypto";

// NON CI SONO PIÙ IMPORT di crypto (sha256, random) qui,
// perché sono gestiti dalla libreria!

/**
 * Input for getCredentialOfferFlowThunk
 */
export type GetCredentialOfferFlowThunkInput = {
  qrcode: string;
};

/**
 * Output: verified & parsed credential
 */
export type GetCredentialOfferFlowThunkOutput = CredentialOfferResult;

/**
 * Thunk to execute the full OpenID4VCI Credential Offer flow (authorization_code grant)
 */
export const getCredentialOfferFlowThunk = createAppAsyncThunk<
  any,
  GetCredentialOfferFlowThunkInput
>("credential/offerFlow", async ({ qrcode }, { getState }) => {
  console.log("Starting Credential Offer Flow from QR Code:", qrcode);
  const env = selectEnv(getState());
  const { REDIRECT_URI } = getEnv(env);

  // Create DPoP context for the whole issuance flow
  await regenerateCryptoKey(DPOP_KEYTAG);
  const dPopCryptoContext = createCryptoContextFor(DPOP_KEYTAG);

  const credentialKeyTag = uuidv4().toString();
  await generate(credentialKeyTag);
  const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

  const { credential_offer, credential_offer_uri } =
    Credential.Offer.startFlowFromQR(qrcode);

  const offer = credential_offer_uri
    ? await Credential.Offer.fetchCredentialOffer(credential_offer_uri, {
        appFetch,
      })
    : credential_offer;

  if (!offer) {
    throw new Error("Invalid credential offer");
  }

  const { issuerConf } = await Credential.Offer.evaluateIssuerMetadataFromOffer(
    offer,
    {
      appFetch,
    }
  );

  console.log("Issuer configuration:", issuerConf);

  const grant = Credential.Offer.selectGrantType(offer);
  if (grant.type !== "authorization_code") {
    throw new Error("Only authorization_code grant is supported");
  }

  console.log("Preparing authorization");

  const clientId = "urn:ietf:params:oauth:client:wallet";
  const baseRedirectUri = new URL(REDIRECT_URI).protocol.replace(":", "");

  const { authorizationUrl, codeVerifier, tokenEndpoint, jwksUri } =
    await Credential.Offer.prepareAuthorization(
      {
        clientId: clientId,
        redirectUri: REDIRECT_URI,
        offer: offer,
        grantSelection: grant,
        issuerConf: issuerConf,
      },
      { appFetch }
    );

  console.log("Saving for token exchange", codeVerifier, tokenEndpoint);

  console.log("Opening auth session:", authorizationUrl);

  const supportsCustomTabs = await supportsInAppBrowser();
  if (!supportsCustomTabs) {
    throw new Error("Custom tabs are not supported");
  }

  const redirectUrl = await openAuthenticationSession(
    authorizationUrl,
    baseRedirectUri
  );

  console.log("Redirect URL:", redirectUrl);

  const parsedUrl = new URL(redirectUrl);
  const authorizationCode = parsedUrl.searchParams.get("code")!;

  const tokenResponse = await Credential.Offer.authorizeAccess(
    {
      tokenEndpoint: tokenEndpoint,
      authorizationCode: authorizationCode,
      redirectUri: REDIRECT_URI,
      clientId: clientId,
      codeVerifier: codeVerifier,
    },
    {
      appFetch,
      dpopCryptoContext: dPopCryptoContext,
    }
  );

  console.log("Access Token received:", tokenResponse);

  console.log("Requesting credential from endpoint...");

  const credentialConfigurationId = offer.credential_configuration_ids[0]!;

  const credentialResponse = await Credential.Offer.obtainCredential(
    issuerConf,
    tokenResponse,
    clientId,
    credentialConfigurationId,
    {
      appFetch,
      credentialCryptoContext,
      dPopCryptoContext,
    }
  );

  console.log("Credential received!", credentialResponse);

  const { parsedCredential } = await Credential.Offer.verifyAndParseCredential(
    issuerConf,
    credentialResponse.credential,
    credentialConfigurationId,
    {
      credentialCryptoContext: credentialCryptoContext,
      jwksUri,
      appFetch,
      ignoreMissingAttributes: true,
      includeUndefinedAttributes: true,
    },
    "MIIC3TCCAoOgAwIBAgIUEwybFc9Jw+az3r188OiHDaxCfHEwCgYIKoZIzj0EAwMwXDEeMBwGA1UEAwwVUElEIElzc3VlciBDQSAtIFVUIDAyMS0wKwYDVQQKDCRFVURJIFdhbGxldCBSZWZlcmVuY2UgSW1wbGVtZW50YXRpb24xCzAJBgNVBAYTAlVUMB4XDTI1MDMyNDIwMjYxNFoXDTM0MDYyMDIwMjYxM1owXDEeMBwGA1UEAwwVUElEIElzc3VlciBDQSAtIFVUIDAyMS0wKwYDVQQKDCRFVURJIFdhbGxldCBSZWZlcmVuY2UgSW1wbGVtZW50YXRpb24xCzAJBgNVBAYTAlVUMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEesDKj9rCIcrGj0wbSXYvCV953bOPSYLZH5TNmhTz2xa7VdlvQgQeGZRg1PrF5AFwt070wvL9qr1DUDdvLp6a1qOCASEwggEdMBIGA1UdEwEB/wQIMAYBAf8CAQAwHwYDVR0jBBgwFoAUYseURyi9D6IWIKeawkmURPEB08cwEwYDVR0lBAwwCgYIK4ECAgAAAQcwQwYDVR0fBDwwOjA4oDagNIYyaHR0cHM6Ly9wcmVwcm9kLnBraS5ldWRpdy5kZXYvY3JsL3BpZF9DQV9VVF8wMi5jcmwwHQYDVR0OBBYEFGLHlEcovQ+iFiCnmsJJlETxAdPHMA4GA1UdDwEB/wQEAwIBBjBdBgNVHRIEVjBUhlJodHRwczovL2dpdGh1Yi5jb20vZXUtZGlnaXRhbC1pZGVudGl0eS13YWxsZXQvYXJjaGl0ZWN0dXJlLWFuZC1yZWZlcmVuY2UtZnJhbWV3b3JrMAoGCCqGSM49BAMDA0gAMEUCIQCe4R9rO4JhFp821kO8Gkb8rXm4qGG/e5/Oi2XmnTQqOQIgfFs+LDbnP2/j1MB4rwZ1FgGdpr4oyrFB9daZyRIcP90=",
    {
      connectTimeout: 10000,
      readTimeout: 10000,
      requireCrl: false,
    }
  );

  console.log("Credential parsed successfully:", parsedCredential);

  return null;
});
