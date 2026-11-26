import { requireNativeModule } from "expo";
import { Platform } from "react-native";

export type IntegrityError = {
  message: IntegrityErrorCodes;
  userInfo: Record<string, string>;
};

export type IntegrityErrorCodes =
  | "ATTESTATION_ERROR"
  | "CHALLANGE_ERROR"
  | "CLIENT_DATA_ENCODING_ERROR"
  | "DECODING_ASSERTION_FAILED"
  | "GENERATION_ASSERTION_FAILED"
  | "GENERATION_KEY_FAILED"
  | "KEY_ALREADY_EXISTS"
  | "KEY_IS_NOT_HARDWARE_BACKED"
  | "KEYSTORE_NOT_INITIALIZED"
  | "PLATFORM_NOT_SUPPORTED"
  | "PREPARE_FAILED"
  | "PREPARE_NOT_CALLED"
  | "REQUEST_ATTESTATION_FAILED"
  | "REQUEST_TOKEN_FAILED"
  | "UNSUPPORTED_DEVICE"
  | "UNSUPPORTED_IOS_VERSION"
  | "UNSUPPORTED_SERVICE"
  | "WRONG_GOOGLE_CLOUD_PROJECT_NUMBER_FORMAT";

type NativeIntegrity = {
  generateHardwareKey(): Promise<string>;
  generateHardwareSignatureWithAssertion(
    clientData: string,
    hardwareKeyTag: string,
  ): Promise<string>;
  getAttestation(challenge: string, hardwareKeyTag: string): Promise<string>;
  isAttestationServiceAvailable(): Promise<boolean>;
  isPlayServicesAvailable(): Promise<boolean>;
  prepareIntegrityToken(cloudProjectNumber: string): Promise<void>;
  requestIntegrityToken(requestHash: null | string): Promise<string>;
};

export function generateHardwareKey(): Promise<string> {
  return call(["ios"], (module) => module.generateHardwareKey());
}

export function generateHardwareSignatureWithAssertion(
  clientData: string,
  hardwareKeyTag: string,
): Promise<string> {
  return call(["ios"], (module) =>
    module.generateHardwareSignatureWithAssertion(clientData, hardwareKeyTag),
  );
}

export function getAttestation(
  challenge: string,
  hardwareKeyTag: string,
): Promise<string> {
  return call(["ios", "android"], (module) =>
    module.getAttestation(challenge, hardwareKeyTag),
  );
}

export function isAttestationServiceAvailable(): Promise<boolean> {
  return call(["ios"], (module) => module.isAttestationServiceAvailable());
}

export function isPlayServicesAvailable(): Promise<boolean> {
  return call(["android"], (module) => module.isPlayServicesAvailable());
}

export function prepareIntegrityToken(
  cloudProjectNumber: string,
): Promise<void> {
  return call(["android"], (module) =>
    module.prepareIntegrityToken(cloudProjectNumber),
  );
}

export function requestIntegrityToken(requestHash?: string): Promise<string> {
  return call(["android"], (module) =>
    module.requestIntegrityToken(requestHash ?? null),
  );
}

async function call<T>(
  platforms: readonly string[],
  operation: (module: NativeIntegrity) => Promise<T>,
): Promise<T> {
  if (!platforms.includes(Platform.OS)) {
    throw { message: "PLATFORM_NOT_SUPPORTED", userInfo: {} };
  }
  const module = requireNativeModule<NativeIntegrity>("ExpoIntegrity");
  try {
    return await operation(module);
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
    ) {
      const detail =
        "message" in error && typeof error.message === "string"
          ? error.message
          : "";
      throw {
        message: error.code,
        userInfo: detail && detail !== error.code ? { error: detail } : {},
      };
    }
    throw error;
  }
}
