import {
  PRE_GOOGLE_CLOUD_PROJECT_NUMBER,
  PRE_REDIRECT_URI,
  PRE_WALLET_EAA_PROVIDER_BASE_URL,
  PRE_WALLET_PID_PROVIDER_BASE_URL,
  PRE_WALLET_PROVIDER_BASE_URL,
  PRE_VERIFIER_BASE_URL,
  PROD_GOOGLE_CLOUD_PROJECT_NUMBER,
  PROD_REDIRECT_URI,
  PROD_WALLET_EAA_PROVIDER_BASE_URL,
  PROD_WALLET_PID_PROVIDER_BASE_URL,
  PROD_WALLET_PROVIDER_BASE_URL,
  PROD_VERIFIER_BASE_URL,
} from "@env";
import type { EnvType } from "../store/types";
import * as z from "zod";

/**
 * Environment type definition for both the pre and prod environments.
 */
export type Env = {
  WALLET_PROVIDER_BASE_URL: string;
  WALLET_PID_PROVIDER_BASE_URL: string;
  WALLET_EAA_PROVIDER_BASE_URL: string;
  REDIRECT_URI: string;
  GOOGLE_CLOUD_PROJECT_NUMBER: string;
  VERIFIER_BASE_URL: string;
};

/**
 * Utility functions which returns the environment variables based on the selected environment.
 * @param env - The selected environment
 * @returns the environment variables for the selected environment
 */
export const getEnv = (env: EnvType): Env => {
  switch (env) {
    case "pre":
      return {
        WALLET_PROVIDER_BASE_URL: PRE_WALLET_PROVIDER_BASE_URL,
        WALLET_PID_PROVIDER_BASE_URL: PRE_WALLET_PID_PROVIDER_BASE_URL,
        WALLET_EAA_PROVIDER_BASE_URL: PRE_WALLET_EAA_PROVIDER_BASE_URL,
        REDIRECT_URI: PRE_REDIRECT_URI,
        GOOGLE_CLOUD_PROJECT_NUMBER: PRE_GOOGLE_CLOUD_PROJECT_NUMBER,
        VERIFIER_BASE_URL: PRE_VERIFIER_BASE_URL,
      };
    case "prod":
      return {
        WALLET_PROVIDER_BASE_URL: PROD_WALLET_PROVIDER_BASE_URL,
        WALLET_PID_PROVIDER_BASE_URL: PROD_WALLET_PID_PROVIDER_BASE_URL,
        WALLET_EAA_PROVIDER_BASE_URL: PROD_WALLET_EAA_PROVIDER_BASE_URL,
        REDIRECT_URI: PROD_REDIRECT_URI,
        GOOGLE_CLOUD_PROJECT_NUMBER: PROD_GOOGLE_CLOUD_PROJECT_NUMBER,
        VERIFIER_BASE_URL: PROD_VERIFIER_BASE_URL,
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

/**
 * IDPHINT for SPID when using the PRE environment of the identity provider.
 */
export const SPID_DEMO_IDPHINT = "https://demo.spid.gov.it";

/**
 * Utility function which returns the IDPHINT for CIE based on the selected environment.
 * @param env - The selected environment
 * @returns the IDPHINT for CIE based on the selected environment
 */
export const getCieIdpHint = (env: EnvType) =>
  env === "pre" ? CIE_UAT_IDPHINT : CIE_PROD_IDPHINT;

/**
 * Validates a logging server address.
 * It matches, for example, the following address:
 * - http://example.com:8080/path/to/resource
 * - https://192.168.1.1:5000/path/to/resource
 * - http://localhost:8080
 * - http://192.168.1.1:5000
 * @param address - The address of the logging server.
 * @returns the address if it is valid.
 */
export const validateLoggingAddress = (address: string) =>
  z.string().url().parse(address);
