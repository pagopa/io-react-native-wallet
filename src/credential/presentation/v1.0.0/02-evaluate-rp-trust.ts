import { getRelyingPartyEntityConfiguration } from "../../../trust/v1.0.0/entities";
import type { RemotePresentationApi } from "../api";
import { mapToRelyingPartyConfig } from "./mappers";

export const evaluateRelyingPartyTrust: RemotePresentationApi["evaluateRelyingPartyTrust"] =
  async (rpUrl, { appFetch = fetch } = {}) => {
    const rpEntityConfiguration = await getRelyingPartyEntityConfiguration(
      rpUrl,
      { appFetch }
    );
    return {
      rpConf: mapToRelyingPartyConfig(rpEntityConfiguration),
    };
  };
