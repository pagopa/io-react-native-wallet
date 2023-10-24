import type { Out } from "../../utils/misc";
import type { StartUserAuthorization } from "./03-start-user-authorization";

/**
 * The interface of the phase to complete User authorization.
 * It may be implemented as a Credential presentation
 * or with a strong User identification
 *
 * @param requestUri The url to reach to complete the user authorization.
 * @param cliendId Identifies the current client across all the requests of the issuing flow
 *
 * @returns the access code to use to request the credental
 */
export type CompleteUserAuthorization = (
  requestUri: Out<StartUserAuthorization>["requestUri"],
  clientId: Out<StartUserAuthorization>["clientId"]
) => Promise<{ code: string }>;
