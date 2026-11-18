import * as z from "zod";

const url = z.string().url();

const envSchema = z.object({
  EXPO_PUBLIC_REDIRECT_URI: url,
  EXPO_PUBLIC_WALLET_EAA_PROVIDER_BASE_URL_V1_4: url,
  EXPO_PUBLIC_WALLET_PID_PROVIDER_BASE_URL_V1_4: url,
  EXPO_PUBLIC_WALLET_PROVIDER_BASE_URL: url,
});

export type ExpoEnvironment = z.infer<typeof envSchema>;

const rawEnv = {
  EXPO_PUBLIC_REDIRECT_URI: process.env.EXPO_PUBLIC_REDIRECT_URI,
  EXPO_PUBLIC_WALLET_EAA_PROVIDER_BASE_URL_V1_4:
    process.env.EXPO_PUBLIC_WALLET_EAA_PROVIDER_BASE_URL_V1_4,
  EXPO_PUBLIC_WALLET_PID_PROVIDER_BASE_URL_V1_4:
    process.env.EXPO_PUBLIC_WALLET_PID_PROVIDER_BASE_URL_V1_4,
  EXPO_PUBLIC_WALLET_PROVIDER_BASE_URL:
    process.env.EXPO_PUBLIC_WALLET_PROVIDER_BASE_URL,
};

let env: ExpoEnvironment | null = null;

export const initEnv = (): void => {
  if (env) {
    return;
  }

  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(({ message, path }) => `${path.join(".")}: ${message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  env = parsed.data;
};

export const getEnv = (): ExpoEnvironment => {
  if (!env) {
    throw new Error(
      "Environment not validated. Call initEnv() during application startup.",
    );
  }

  return env;
};
