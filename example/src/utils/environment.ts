import {
  PRE_GOOGLE_CLOUD_PROJECT_NUMBER,
  PRE_REDIRECT_URI,
  PRE_WALLET_EAA_PROVIDER_BASE_URL,
  PRE_WALLET_PID_PROVIDER_BASE_URL,
  PRE_WALLET_PROVIDER_BASE_URL,
  PROD_GOOGLE_CLOUD_PROJECT_NUMBER,
  PROD_REDIRECT_URI,
  PROD_WALLET_EAA_PROVIDER_BASE_URL,
  PROD_WALLET_PID_PROVIDER_BASE_URL,
  PROD_WALLET_PROVIDER_BASE_URL,
} from "@env";

export type EnvType = "pre" | "prod";

export type Env = {
  WALLET_PROVIDER_BASE_URL: string;
  WALLET_PID_PROVIDER_BASE_URL: string;
  WALLET_EAA_PROVIDER_BASE_URL: string;
  REDIRECT_URI: string;
  GOOGLE_CLOUD_PROJECT_NUMBER: string;
};

export const getEnv = (env: EnvType): Env => {
  switch (env) {
    case "pre":
      return {
        WALLET_PROVIDER_BASE_URL: PRE_WALLET_PROVIDER_BASE_URL,
        WALLET_PID_PROVIDER_BASE_URL: PRE_WALLET_PID_PROVIDER_BASE_URL,
        WALLET_EAA_PROVIDER_BASE_URL: PRE_WALLET_EAA_PROVIDER_BASE_URL,
        REDIRECT_URI: PRE_REDIRECT_URI,
        GOOGLE_CLOUD_PROJECT_NUMBER: PRE_GOOGLE_CLOUD_PROJECT_NUMBER,
      };
    case "prod":
      return {
        WALLET_PROVIDER_BASE_URL: PROD_WALLET_PROVIDER_BASE_URL,
        WALLET_PID_PROVIDER_BASE_URL: PROD_WALLET_PID_PROVIDER_BASE_URL,
        WALLET_EAA_PROVIDER_BASE_URL: PROD_WALLET_EAA_PROVIDER_BASE_URL,
        REDIRECT_URI: PROD_REDIRECT_URI,
        GOOGLE_CLOUD_PROJECT_NUMBER: PROD_GOOGLE_CLOUD_PROJECT_NUMBER,
      };
  }
};

/**
 * IDPHINT for CIE when using the PROD environment of the identity provider.
 */
export const CIE_PROD_IDPHINT =
  "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

/**
 * IDPHINT for CIE when using the UAT environment of the identity provider.
 */
export const CIE_UAT_IDPHINT =
  "https://collaudo.idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

export const getCieIdpHint = (env: EnvType) =>
  env === "pre" ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT;

export const SPID_DEMO_IDPHINT = "https://demo.spid.gov.it";
