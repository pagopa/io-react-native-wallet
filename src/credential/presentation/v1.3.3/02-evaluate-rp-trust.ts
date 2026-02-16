import { getRelyingPartyEntityConfiguration } from "src/trust/v1.3.3/entities";
import type { RemotePresentationApi } from "../api";
import { itWalletCredentialVerifierMetadataV1_3 } from "@pagopa/io-wallet-oid-federation";
import { mapToRelyingPartyConfig } from "./mappers";

export const evaluateRelyingPartyTrust: RemotePresentationApi["evaluateRelyingPartyTrust"] =
  async (rpUrl, { appFetch = fetch } = {}) => {
    const rpEntityConfiguration = await getRelyingPartyEntityConfiguration(rpUrl, { appFetch });

    const rpConf = mapToRelyingPartyConfig(rpEntityConfiguration);
    const rpMetadata = itWalletCredentialVerifierMetadataV1_3.parse(
      rpEntityConfiguration.payload.metadata.openid_credential_verifier
    );

    return { rpConf, rpMetadata };
  };
