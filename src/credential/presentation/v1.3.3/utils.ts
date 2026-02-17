import { InvalidRequestObjectError } from "../common/errors";
import type { RelyingPartyConfig } from "../api";
import {
  itWalletCredentialVerifierMetadataV1_3,
  type ItWalletCredentialVerifierMetadataV1_3,
} from "@pagopa/io-wallet-oid-federation";

export function assertRpMetadataV1_3(
  rpConf: RelyingPartyConfig
): ItWalletCredentialVerifierMetadataV1_3 {
  const res = itWalletCredentialVerifierMetadataV1_3.safeParse(rpConf);

  if (!res.success) {
    throw new InvalidRequestObjectError(
      "Relying Party configuration is not compatible with ITW 1.3.3"
    );
  }

  return res.data;
}
