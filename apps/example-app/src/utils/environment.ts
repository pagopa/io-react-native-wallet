import { type ItwVersion } from "@io-app-it-wallet/io-react-native-wallet";
import * as z from "zod";

import type { EnvType } from "../store/types";

import { getEnv as getValidatedEnv } from "../env";

/**
 * Environment type definition for both the pre and prod environments.
 */
export interface Env {
  GOOGLE_CLOUD_PROJECT_NUMBER: string;
  REDIRECT_URI: string;
  WALLET_EAA_PROVIDER_BASE_URL: ItwSpecsEnvVar;
  WALLET_PID_PROVIDER_BASE_URL: ItwSpecsEnvVar;
  WALLET_PROVIDER_BASE_URL: string;
  WALLET_TA_BASE_URL: string;
  X509_CERT_ROOT: string;
}

/**
 * Wrapper for an env variable that has different values for each IT-Wallet specs version.
 *
 * Call `.value()` to get the value for the specified version.
 *
 * @example
 * myVar.value("1.3.3")
 */
class ItwSpecsEnvVar {
  constructor(private values: Record<ItwVersion, string>) {}

  value(version: ItwVersion) {
    return this.values[version];
  }
}

/**
 * Utility functions which returns the environment variables based on the selected environment.
 * @param env - The selected environment
 * @returns the environment variables for the selected environment
 */
export const getEnv = (selectedEnv: EnvType): Env => {
  const env = getValidatedEnv();

  switch (selectedEnv) {
    case "pre":
      return {
        GOOGLE_CLOUD_PROJECT_NUMBER:
          env.EXPO_PUBLIC_PRE_GOOGLE_CLOUD_PROJECT_NUMBER,
        REDIRECT_URI: env.EXPO_PUBLIC_PRE_REDIRECT_URI,
        WALLET_EAA_PROVIDER_BASE_URL: new ItwSpecsEnvVar({
          "1.4.6": env.EXPO_PUBLIC_PRE_WALLET_EAA_PROVIDER_BASE_URL_V1_4,
        }),
        WALLET_PID_PROVIDER_BASE_URL: new ItwSpecsEnvVar({
          "1.4.6": env.EXPO_PUBLIC_PRE_WALLET_PID_PROVIDER_BASE_URL_V1_4,
        }),
        WALLET_PROVIDER_BASE_URL: env.EXPO_PUBLIC_PRE_WALLET_PROVIDER_BASE_URL,
        WALLET_TA_BASE_URL: env.EXPO_PUBLIC_PRE_WALLET_TA_BASE_URL,
        X509_CERT_ROOT: env.EXPO_PUBLIC_PRE_X509_CERT_ROOT,
      };
    case "prod":
      return {
        GOOGLE_CLOUD_PROJECT_NUMBER:
          env.EXPO_PUBLIC_PROD_GOOGLE_CLOUD_PROJECT_NUMBER,
        REDIRECT_URI: env.EXPO_PUBLIC_PROD_REDIRECT_URI,
        WALLET_EAA_PROVIDER_BASE_URL: new ItwSpecsEnvVar({
          "1.4.6": env.EXPO_PUBLIC_PROD_WALLET_EAA_PROVIDER_BASE_URL_V1_4,
        }),
        WALLET_PID_PROVIDER_BASE_URL: new ItwSpecsEnvVar({
          "1.4.6": env.EXPO_PUBLIC_PROD_WALLET_PID_PROVIDER_BASE_URL_V1_4,
        }),
        WALLET_PROVIDER_BASE_URL: env.EXPO_PUBLIC_PROD_WALLET_PROVIDER_BASE_URL,
        WALLET_TA_BASE_URL: env.EXPO_PUBLIC_PROD_WALLET_TA_BASE_URL,
        X509_CERT_ROOT: env.EXPO_PUBLIC_PROD_X509_CERT_ROOT,
      };
  }
};

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
