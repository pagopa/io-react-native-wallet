import {
  IdentificationResultShape,
  type IdentificationContext,
} from "src/utils/identification";
import type { Out } from "../../utils/misc";
import type { StartUserAuthorization } from "./03-start-user-authorization";
import parseUrl from "parse-url";
import { LoginResponseError } from "src/utils/errors";

export type CompleteUserAuthorization = (
  indetificationContext: IdentificationContext,
  requestUri: Out<StartUserAuthorization>["requestUri"],
  clientId: Out<StartUserAuthorization>["clientId"]
) => Promise<{ code: string; state: string; iss: string }>;

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
export const completeUserAuthorization: CompleteUserAuthorization = async (
  indetificationContext: IdentificationContext,
  requestUri: Out<StartUserAuthorization>["requestUri"],
  clientId: Out<StartUserAuthorization>["clientId"]
): Promise<{ code: string; state: string; iss: string }> => {
  const data = await indetificationContext.identify(
    "http://127.0.0.1:8000/redirect_page",
    "iowallet" // make it an env variable
  );
  const urlParse = parseUrl(data);
  const result = IdentificationResultShape.safeParse(urlParse.query);
  if (result.success) {
    return result.data;
  } else {
    throw new LoginResponseError(result.error.message);
  }
};
