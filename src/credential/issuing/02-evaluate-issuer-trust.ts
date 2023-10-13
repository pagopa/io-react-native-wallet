import { getEntityConfiguration } from "../../trust";
import { CredentialIssuerEntityConfiguration2 } from "../../trust/types";
import type { StartFlow } from "./01-start-flow";
import type { Out } from "./utils";

type EvaluateIssuerTrustContext = {
  appFetch?: GlobalFetch["fetch"];
};

export type EvaluateIssuerTrust = (
  issuerUrl: Out<StartFlow>["issuerUrl"]
) => Promise<{
  issuerConf: CredentialIssuerEntityConfiguration2["payload"]["metadata"];
}>;

export const evaluateIssuerTrust =
  (ctx: EvaluateIssuerTrustContext = {}): EvaluateIssuerTrust =>
  async (issuerUrl) => {
    const { appFetch = fetch } = ctx;

    const {
      header,
      payload: { metadata, ...payload },
    } = await getEntityConfiguration(issuerUrl, {
      appFetch,
    });

    const enriched = {
      header,
      payload: {
        ...payload,
        metadata: {
          ...metadata,
          openid_credential_issuer: {
            credential_issuer: payload.iss,
            pushed_authorization_request_endpoint: new URL(
              "/as/par",
              payload.iss
            ).href,
            authorization_endpoint: new URL("/authorize", payload.iss).href,
            token_endpoint: new URL("/token", payload.iss).href,
            dpop_signing_alg_values_supported: [
              "RS256",
              "RS512",
              "ES256",
              "ES512",
            ],
            credential_endpoint: new URL("/credential", payload.iss).href,
            jwks: {
              keys: [],
            },
            credentials_supported: [
              {
                id: "mdl",
                format: "vc+sd-jwt",
                cryptographic_binding_methods_supported: [],
                cryptographic_suites_supported: [],
                display: [],
                credential_definition: {
                  type: ["mDL"],
                  credentialSubject: {
                    my_field: {
                      mandatory: true,
                      display: [{ name: "My Field name", locale: "it-IT" }],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    };

    const issuerConf =
      CredentialIssuerEntityConfiguration2.parse(enriched).payload.metadata;

    return { issuerConf };
  };
