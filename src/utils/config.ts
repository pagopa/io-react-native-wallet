import {
  IoWalletSdkConfig,
  ItWalletSpecsVersion,
} from "@pagopa/io-wallet-utils";

/**
 * IO Wallet SDK configuration object for v1.0 specs.
 */
export const sdkConfigV1_0 = new IoWalletSdkConfig({
  itWalletSpecsVersion: ItWalletSpecsVersion.V1_0,
});

/**
 * IO Wallet SDK configuration object for v1.3 specs.
 */
export const sdkConfigV1_3 = new IoWalletSdkConfig({
  itWalletSpecsVersion: ItWalletSpecsVersion.V1_3,
});
