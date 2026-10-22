import { decode, verify } from "@pagopa/io-react-native-jwt";

import { StatusList } from "../../../credential/status/api/types";
import { getJwkFromCertificateChain } from "../../../utils/crypto";
import { IoWalletError } from "../../../utils/errors";
import { StatusListHeader } from "./types";

/**
 * Verifies a Status List Token in JWT format (IETF Token Status List, Section 8.3):
 * - it is signed with the key of the leaf certificate of its `x5c`;
 * - its `typ` is `statuslist+jwt`;
 * - its `sub` is the URI it was fetched from;
 * - it is not expired.
 *
 * The signer certificate chain is NOT verified against a trust anchor yet.
 * TODO: verify the Status List signer certificate chain against the EU List of Trusted Lists (LoTL).
 *
 * @param statusListJwt - The Status List Token
 * @param uri - The URI the Status List Token was fetched from
 * @returns The verified Status List Token payload
 * @throws {IoWalletError} If the Status List Token is not valid
 */
export const verifyStatusList = async (
  statusListJwt: string,
  uri: string,
): Promise<StatusList> => {
  const { payload, protectedHeader } = (() => {
    try {
      return decode(statusListJwt);
    } catch {
      throw new IoWalletError("The Status List Token is not a valid JWT");
    }
  })();

  const header = StatusListHeader.safeParse(protectedHeader);
  if (!header.success) {
    throw new IoWalletError(
      `The Status List Token has no certificate chain (x5c): ${header.error.message}`,
    );
  }

  await verify(
    statusListJwt,
    await getJwkFromCertificateChain(header.data.x5c),
    {
      subject: uri,
      typ: "statuslist+jwt",
    },
  ).catch((e) => {
    throw new IoWalletError(
      `The Status List Token verification failed: ${e instanceof Error ? e.message : String(e)}`,
    );
  });

  const statusList = StatusList.safeParse(payload);
  if (!statusList.success) {
    throw new IoWalletError(
      `Invalid Status List Token: ${statusList.error.message}`,
    );
  }
  return statusList.data;
};
