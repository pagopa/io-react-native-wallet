import uuid from "react-native-uuid";
import { useEphemeralKey } from "../../utils/crypto";
import { createDPopToken } from "../../utils/dpop";
import { TokenError } from "../../utils/errors";
import type { AuthorizeUser } from "./03-authorize-user";
import type { Out } from "./utils";
import type { EvaluateIssuerTrust } from "./02-evaluate-issuer-trust";
import { ASSERTION_TYPE } from "./const";

type AuthorizeAccessContext = {
  walletInstanceAttestation: string;
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
};

export type AuthorizeAccess = (
  issuerConf: Out<EvaluateIssuerTrust>["issuerConf"],
  code: Out<AuthorizeUser>["code"],
  clientId: Out<AuthorizeUser>["clientId"]
) => Promise<{ accessToken: string; nonce: string; clientId: string }>;

export const authorizeAccess =
  (ctx: AuthorizeAccessContext): AuthorizeAccess =>
  async (
    issuerConf,
    code,
    clientId
  ): Promise<{ accessToken: string; nonce: string; clientId: string }> => {
    const {
      appFetch = fetch,
      walletInstanceAttestation,
      walletProviderBaseUrl,
    } = ctx;

    const tokenUrl = issuerConf.openid_credential_issuer.token_endpoint;

    // Use an ephemeral key to be destroyed after use
    const signedDPop = await useEphemeralKey((ephemeralContext) =>
      createDPopToken(
        {
          htm: "POST",
          htu: tokenUrl,
          jti: `${uuid.v4()}`,
        },
        ephemeralContext
      )
    );

    const codeVerifier = `${uuid.v4()}`;
    const requestBody = {
      grant_type: "authorization code",
      client_id: clientId,
      code,
      code_verifier: codeVerifier,
      client_assertion_type: ASSERTION_TYPE,
      client_assertion: walletInstanceAttestation,
      redirect_uri: walletProviderBaseUrl,
    };
    var formBody = new URLSearchParams(requestBody);

    const response = await appFetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        DPoP: signedDPop,
      },
      body: formBody.toString(),
    });

    if (response.status === 200) {
      const { c_nonce, access_token } = await response.json();
      return {
        accessToken: access_token,
        nonce: c_nonce,
        clientId,
      };
    }
    throw new TokenError(
      `Unable to obtain token. Response code: ${await response.text()}`
    );
  };
