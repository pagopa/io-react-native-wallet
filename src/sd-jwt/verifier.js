import { sha256ToBase64 } from "@pagopa/io-react-native-jwt";
import { ValidationFailed } from "../utils/errors";
export const verifyDisclosure = async ({ encoded, decoded }, claims) => {
  let hash = await sha256ToBase64(encoded);
  if (!claims.includes(hash)) {
    throw new ValidationFailed(
      "Validation of disclosure failed",
      `${decoded}`,
      "Disclosure hash not found in claims"
    );
  }
};
