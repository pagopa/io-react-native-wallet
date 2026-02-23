import { getRelyingPartyEntityConfiguration } from "src/trust/v1.3.3/entities";
import type { RemotePresentationApi } from "../api";
import { mapToRelyingPartyConfig } from "./mappers";

export const evaluateRelyingPartyTrust: RemotePresentationApi["evaluateRelyingPartyTrust"] =
  async (rpUrl, { appFetch = fetch } = {}) => {
    const rpEntityConfiguration = await getRelyingPartyEntityConfiguration(
      rpUrl,
      { appFetch }
    );

    const rpConf = mapToRelyingPartyConfig(rpEntityConfiguration);

    return { rpConf };
  };
