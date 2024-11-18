import { decode } from "@pagopa/io-react-native-jwt";
import { getCredentialTrustmarkJwt } from "../get-credential-trustmark";
import { createCryptoContextFor } from "../../../utils/crypto";
import { generate } from "@pagopa/io-react-native-crypto";

describe("getCredentialTrustmarkJwt", () => {
  it("should generate a JWT with the correct payload", async () => {
    const ephemeralKeytag = `ephemeral-${Math.random()}`;
    await generate(ephemeralKeytag);

    const walletInstanceAttestation = "walletInstanceAttestation";
    const wiaCryptoContext = createCryptoContextFor(ephemeralKeytag);
    const credentialType = "MDL";
    const documentNumber = "1234567890";

    const jwt = await getCredentialTrustmarkJwt(
      walletInstanceAttestation,
      wiaCryptoContext,
      credentialType,
      documentNumber
    );

    const decoded = decode(jwt);
    expect(decoded.payload.iss).toBe(walletInstanceAttestation);
    expect(decoded.payload.sub).toBe(credentialType);
    expect(decoded.payload.subtyp).toContain("*");
  });
});
