import { type ItwVersion } from "@io-app-it-wallet/io-react-native-wallet";
import * as z from "zod";

import { getEnv as getValidatedEnv } from "../env";

/**
 * Environment type definition.
 */
export interface Env {
  REDIRECT_URI: string;
  WALLET_EAA_PROVIDER_BASE_URL: string;
  WALLET_PID_PROVIDER_BASE_URL: string;
  WALLET_PROVIDER_BASE_URL: string;
}

/**
 * IT-Wallet technical specifications version used by the app.
 */
export const ITW_VERSION: ItwVersion = "1.4.6";

/**
 * Returns the environment variables.
 */
export const getEnv = (): Env => {
  const env = getValidatedEnv();

  return {
    REDIRECT_URI: env.EXPO_PUBLIC_REDIRECT_URI,
    WALLET_EAA_PROVIDER_BASE_URL:
      env.EXPO_PUBLIC_WALLET_EAA_PROVIDER_BASE_URL_V1_4,
    WALLET_PID_PROVIDER_BASE_URL:
      env.EXPO_PUBLIC_WALLET_PID_PROVIDER_BASE_URL_V1_4,
    WALLET_PROVIDER_BASE_URL: env.EXPO_PUBLIC_WALLET_PROVIDER_BASE_URL,
  };
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
