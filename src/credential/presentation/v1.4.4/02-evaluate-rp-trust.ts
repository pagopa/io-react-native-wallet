import type { RemotePresentationApi } from "../api";

import { getRelyingPartyEntityConfiguration } from "../../../trust/v1.4.4/entities";
import { mapToRelyingPartyConfig } from "./mappers";

export const evaluateRelyingPartyTrust: RemotePresentationApi["evaluateRelyingPartyTrust"] =
  async (rpUrl, { appFetch = fetch } = {}) => {
    const rpEntityConfiguration = await getRelyingPartyEntityConfiguration(
      rpUrl,
      { appFetch },
    );

    const rpConf = mapToRelyingPartyConfig(rpEntityConfiguration);

    return { rpConf };
  };
