import {
  createCryptoContextFor,
  Credential,
} from "@pagopa/io-react-native-wallet";
import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import { getEnv } from "../utils/environment";
import { selectEnv } from "../store/reducers/environment";
import { DPOP_KEYTAG, regenerateCryptoKey } from "../utils/crypto";
import { v4 as uuidv4 } from "uuid";
import { generate } from "@pagopa/io-react-native-crypto";
import {
  getTokenResponseFromAuthorizedFlow,
  getTokenResponseFromPreAuthorizedFlow,
} from "../utils/offer";
import type {
  CredentialIssuerMetadata,
  CredentialOffer,
  TokenResponse,
} from "../../../src/credential/offer/types";
import type { GrantTypeSelection } from "../../../src/credential/offer";
import type {
  CredentialOfferResult,
  SupportedCredentials,
} from "../store/types";

export type GetCredentialOfferRequestedParamsFlowThunkInput = {
  qrcode: string;
};

export type GetCredentialOfferRequestedParamsFlowThunkOutput = {
  offer: CredentialOffer;
  grant: GrantTypeSelection;
  issuerConf: CredentialIssuerMetadata;
};

/**
 * Thunk to initiate the Credential Offer flow by parsing the QR code and fetching the offer details.
 * @param qrcode - The QR code string containing the credential offer information.
 * @returns The parsed credential offer, selected grant type, and issuer configuration metadata.
 */
export const getCredentialOfferRequestedParams = createAppAsyncThunk<
  GetCredentialOfferRequestedParamsFlowThunkOutput,
  GetCredentialOfferRequestedParamsFlowThunkInput
>("credential/prepareOffer", async ({ qrcode }) => {
  console.log("Starting Credential Offer Flow from QR Code:", qrcode);

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

  const grant = Credential.Offer.selectGrantType(offer);
  return {
    offer,
    grant,
    issuerConf,
  };
});

export type GetCredentialOfferFlowThunkInput = {
  offer: CredentialOffer;
  grant: GrantTypeSelection;
  issuerConf: CredentialIssuerMetadata;
  txCode?: string;
};

/**
 * Thunk to handle the complete Credential Offer flow, from obtaining tokens to acquiring the credential.
 * @param offer - The credential offer details.
 * @param grant - The selected grant type for the flow.
 * @param issuerConf - The issuer configuration metadata.
 * @param txCode - Optional transaction code for pre-authorized flows.
 * @returns The result of the credential acquisition process.
 */
export const getCredentialOfferFlowThunk = createAppAsyncThunk<
  CredentialOfferResult,
  GetCredentialOfferFlowThunkInput
>(
  "credential/offerFlow",
  async ({ offer, grant, issuerConf, txCode }, { getState }) => {
    const env = selectEnv(getState());
    const { REDIRECT_URI } = getEnv(env);

    // Create DPoP context for the whole issuance flow
    await regenerateCryptoKey(DPOP_KEYTAG);
    const dPopCryptoContext = createCryptoContextFor(DPOP_KEYTAG);

    const credentialKeyTag = uuidv4().toString();
    await generate(credentialKeyTag);
    const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

    const clientId = "urn:ietf:params:oauth:client:wallet";
    let tokenResponse: TokenResponse;

    if (grant.type === "authorization_code") {
      tokenResponse = await getTokenResponseFromAuthorizedFlow({
        clientId,
        redirectUri: REDIRECT_URI,
        offer,
        grantSelection: grant,
        issuerConf,
        context: { appFetch, dpopCryptoContext: dPopCryptoContext },
      });
    } else if (grant.type === "pre-authorized_code") {
      tokenResponse = await getTokenResponseFromPreAuthorizedFlow({
        clientId,
        grantSelection: grant,
        issuerConf,
        offer,
        txCode,
        context: { appFetch, dpopCryptoContext: dPopCryptoContext },
      });
    } else {
      throw new Error(`Unsupported grant type`);
    }

    console.log("Preparing authorization");

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

    const { parsedCredential } =
      await Credential.Offer.verifyAndParseCredential(
        issuerConf,
        credentialResponse.credential,
        credentialConfigurationId,
        {
          credentialCryptoContext: credentialCryptoContext,
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

    return {
      parsedCredential,
      credential: credentialResponse.credential,
      keyTag: credentialKeyTag,
      credentialType: credentialConfigurationId as SupportedCredentials,
      credentialConfigurationId,
      format: credentialResponse.format,
    };
  }
);
