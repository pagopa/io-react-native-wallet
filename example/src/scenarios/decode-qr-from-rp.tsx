import { RelyingPartySolution } from "@pagopa/io-react-native-wallet";
import { error, result } from "./types";

// eudiw://authorize?client_id=https://verifier.example.org&request_uri=https://verifier.example.org/request_uri
const QR =
  "ZXVkaXc6Ly9hdXRob3JpemU/Y2xpZW50X2lkPWh0dHBzOi8vdmVyaWZpZXIuZXhhbXBsZS5vcmcmcmVxdWVzdF91cmk9aHR0cHM6Ly92ZXJpZmllci5leGFtcGxlLm9yZy9yZXF1ZXN0X3VyaQ==";

export default async () => {
  try {
    const decoded = RelyingPartySolution.decodeAuthRequestQR(QR);

    if (decoded.requestURI !== "https://verifier.example.org/request_uri")
      throw new Error(`Wrong requestURI, found: ${decoded.requestURI}`);
    if (decoded.clientId !== "https://verifier.example.org")
      throw new Error(`Wrong clientId, found: ${decoded.clientId}`);
    if (decoded.protocol !== "eudiw:")
      throw new Error(`Wrong protocol, found: ${decoded.protocol}`);
    if (decoded.resource !== "authorize")
      throw new Error(`Wrong resource, found: ${decoded.resource}`);

    return result(decoded);
  } catch (e) {
    return error(e);
  }
};
