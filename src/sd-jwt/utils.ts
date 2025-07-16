import { sha256ToBase64 } from "@pagopa/io-react-native-jwt";
import { hasStatusOrThrow } from "../utils/misc";
import { TypeMetadata, Verification } from "./types";
import {
  IoWalletError,
  IssuerResponseError,
  ValidationFailed,
} from "../utils/errors";
import { decode } from ".";
import { getValueFromDisclosures } from "./converters";

/**
 * Retrieve the Type Metadata for a credential and verify its integrity.
 * @param vct The VCT as a valid HTTPS url
 * @param vctIntegrity The integrity hash
 * @param context.appFetch (optional) fetch api implementation. Default: built-in fetch
 * @returns The credential metadata {@link TypeMetadata}
 */
export const fetchTypeMetadata = async (
  vct: string,
  vctIntegrity: string,
  context: {
    appFetch?: GlobalFetch["fetch"];
  } = {}
): Promise<TypeMetadata> => {
  const { appFetch = fetch } = context;
  const { origin, pathname } = new URL(vct);

  const metadata = await appFetch(`${origin}/.well-known/vct${pathname}`, {
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then(hasStatusOrThrow(200, IssuerResponseError))
    .then((res) => res.json())
    .then(TypeMetadata.parse);

  const [alg, hash] = vctIntegrity.split(/-(.*)/s);

  if (alg !== "sha256") {
    throw new IoWalletError(`${alg} algorithm is not supported`);
  }

  // TODO: [SIW-2264] check if the hash is correctly calculated
  const metadataHash = await sha256ToBase64(JSON.stringify(metadata));

  if (metadataHash !== hash) {
    throw new ValidationFailed({
      message: "Unable to verify VCT integrity",
      reason: "vct#integrity does not match the metadata hash",
    });
  }

  return metadata;
};

/**
 * Extract and validate the `verification` claim from disclosures.
 * @param credentialSdJwt The raw credential SD-JWT
 * @returns The verification claim or undefined if it wasn't found
 */
export const getVerification = (
  credentialSdJwt: string
): Verification | undefined => {
  const { disclosures } = decode(credentialSdJwt);
  const verificationDisclosure = getValueFromDisclosures(
    disclosures.map((d) => d.decoded),
    "verification"
  );
  return verificationDisclosure
    ? Verification.parse(verificationDisclosure)
    : undefined;
};
