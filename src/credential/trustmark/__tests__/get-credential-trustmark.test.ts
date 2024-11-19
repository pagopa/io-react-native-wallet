import { decode, type CryptoContext } from "@pagopa/io-react-native-jwt";
import { getCredentialTrustmarkJwt } from "../get-credential-trustmark";
import { createCryptoContextFor } from "../../../utils/crypto";
import { deleteKey, generate, sign } from "@pagopa/io-react-native-crypto";

// Wallet Instance Attestation
const wia =
  "eyJ0eXAiOiJ3YWxsZXQtYXR0ZXN0YXRpb24rand0IiwiYWxnIjoiRVMyNTYiLCJraWQiOiJjbkRpRW0zNldjdEVnSnBwNUJfazNtdzdkZ2hrNzlNc3FfbHdWT3V4aG5NIn0.eyJhYWwiOiJodHRwczovL3dhbGxldC5pby5wYWdvcGEuaXQvTG9BL2Jhc2ljIiwiYXV0aG9yaXphdGlvbl9lbmRwb2ludCI6ImV1ZGl3OiIsImNuZiI6eyJqd2siOnsiY3J2IjoiUC0yNTYiLCJraWQiOiJzOW9VSlBMbjBuMkptQVh6dW5vRGRFZVBqUzZvZW10TzNWLUdwLXBGVERRIiwia3R5IjoiRUMiLCJ4IjoiZG9JNGFybDdOTUwtUFl0dWJVVV94WndUVnFmQVBaZURjLWExSkx0SHZkdyIsInkiOiJQQXVjVEQyajFTZDl1ODdlYW9iRmxNUmFvX09SWnBCYUJha2JlS2E1Ujc4In19LCJob21lcGFnZV91cmkiOiJodHRwczovL2lvLml0YWxpYS5pdCIsImlzcyI6Imh0dHBzOi8vd2FsbGV0LmlvLnBhZ29wYS5pdCIsInByZXNlbnRhdGlvbl9kZWZpbml0aW9uX3VyaV9zdXBwb3J0ZWQiOmZhbHNlLCJyZXF1ZXN0X29iamVjdF9zaWduaW5nX2FsZ192YWx1ZXNfc3VwcG9ydGVkIjpbIkVTMjU2Il0sInJlc3BvbnNlX21vZGVzX3N1cHBvcnRlZCI6WyJmb3JtX3Bvc3Quand0Il0sInJlc3BvbnNlX3R5cGVzX3N1cHBvcnRlZCI6WyJ2cF90b2tlbiJdLCJzdWIiOiJzOW9VSlBMbjBuMkptQVh6dW5vRGRFZVBqUzZvZW10TzNWLUdwLXBGVERRIiwidnBfZm9ybWF0c19zdXBwb3J0ZWQiOnsidmMrc2Qtand0Ijp7InNkLWp3dF9hbGdfdmFsdWVzIjpbIkVTMjU2IiwiRVMyNTZLIiwiRVMzODQiLCJFUzUxMiIsIlJTMjU2IiwiUlMzODQiLCJSUzUxMiIsIlBTMjU2IiwiUFMzODQiLCJQUzUxMiJdfSwidnArc2Qtand0Ijp7InNkLWp3dF9hbGdfdmFsdWVzIjpbIkVTMjU2IiwiRVMyNTZLIiwiRVMzODQiLCJFUzUxMiIsIlJTMjU2IiwiUlMzODQiLCJSUzUxMiIsIlBTMjU2IiwiUFMzODQiLCJQUzUxMiJdfX0sImlhdCI6MTczMjAwNDU3NywiZXhwIjoxNzMyMDA4MTc3fQ.qGwZfW1_t1wRhSrpUgdowHdzvf1c-6xjDqazEfh86aD9erzqkiroNiu1R1akAvBJQwZiSqiOt_GzdqIVn5Bqbw";

describe("getCredentialTrustmarkJwt", () => {
  it("should generate a JWT with the correct payload", async () => {
    await deleteKey("WIA_KEYTAG");
    await generate("WIA_KEYTAG");

    const wiaCryptoContext: CryptoContext = {
      getPublicKey: async () => ({
        crv: "P-256",
        kid: "s9oUJPLn0n2JmAXzunoDdEePjS6oemtO3V-Gp-pFTDQ",
        kty: "EC",
        x: "doI4arl7NML-PYtubUU_xZwTVqfAPZeDc-a1JLtHvdw",
        y: "PAucTD2j1Sd9u87eaobFlMRao_ORZpBaBakbeKa5R78",
      }),
      getSignature: async (value: string) => sign(value, "WIA_KEYTAG"),
    };
    const credentialType = "MDL";
    const documentNumber = "1234567890";

    const jwt = await getCredentialTrustmarkJwt(
      wia,
      wiaCryptoContext,
      credentialType,
      documentNumber
    );

    const decoded = decode(jwt);
    expect(decoded.payload.iss).toBe(wia);
    expect(decoded.payload.sub).toBe(credentialType);
    expect(decoded.payload.subtyp).toContain("*");
  });

  it("should throw error if thumbprints do not match", async () => {
    const ephemeralKeytag = `ephemeral-${Math.random()}`;
    await generate(ephemeralKeytag);

    const walletInstanceAttestation = "walletInstanceAttestation";
    const wiaCryptoContext = createCryptoContextFor(ephemeralKeytag);
    const credentialType = "MDL";
    const documentNumber = "1234567890";

    await expect(() =>
      getCredentialTrustmarkJwt(
        walletInstanceAttestation,
        wiaCryptoContext,
        credentialType,
        documentNumber
      )
    ).rejects.toThrow();
  });
});
