import { getRelyingPartyEntityConfiguration } from "src/trust/v1.3.3/entities";
import type { RemotePresentationApi } from "../api";
import { mapToRelyingPartyConfig } from "../v1.0.0/mappers";

export const evaluateRelyingPartyTrust: RemotePresentationApi["evaluateRelyingPartyTrust"] =
  async (rpUrl, { appFetch = fetch } = {}) => {
    const rpEntityConfiguration = await getRelyingPartyEntityConfiguration(
      rpUrl,
      { appFetch }
    );

    const rpConf = mapToRelyingPartyConfig(rpEntityConfiguration);

    return { rpConf };
  };
