import { deleteKey, generate } from "@pagopa/io-react-native-crypto";
import { decode, type CryptoContext } from "@pagopa/io-react-native-jwt";
import { getCredentialTrustmark } from "../get-credential-trustmark";

// Wallet Instance Attestation
const walletInstanceAttestation =
  "eyJ0eXAiOiJ3YWxsZXQtYXR0ZXN0YXRpb24rand0IiwiYWxnIjoiRVMyNTYiLCJraWQiOiJjbkRpRW0zNldjdEVnSnBwNUJfazNtdzdkZ2hrNzlNc3FfbHdWT3V4aG5NIn0.eyJhYWwiOiJodHRwczovL3dhbGxldC5pby5wYWdvcGEuaXQvTG9BL2Jhc2ljIiwiYXV0aG9yaXphdGlvbl9lbmRwb2ludCI6ImV1ZGl3OiIsImNuZiI6eyJqd2siOnsiY3J2IjoiUC0yNTYiLCJraWQiOiJzOW9VSlBMbjBuMkptQVh6dW5vRGRFZVBqUzZvZW10TzNWLUdwLXBGVERRIiwia3R5IjoiRUMiLCJ4IjoiZG9JNGFybDdOTUwtUFl0dWJVVV94WndUVnFmQVBaZURjLWExSkx0SHZkdyIsInkiOiJQQXVjVEQyajFTZDl1ODdlYW9iRmxNUmFvX09SWnBCYUJha2JlS2E1Ujc4In19LCJob21lcGFnZV91cmkiOiJodHRwczovL2lvLml0YWxpYS5pdCIsImlzcyI6Imh0dHBzOi8vd2FsbGV0LmlvLnBhZ29wYS5pdCIsInByZXNlbnRhdGlvbl9kZWZpbml0aW9uX3VyaV9zdXBwb3J0ZWQiOmZhbHNlLCJyZXF1ZXN0X29iamVjdF9zaWduaW5nX2FsZ192YWx1ZXNfc3VwcG9ydGVkIjpbIkVTMjU2Il0sInJlc3BvbnNlX21vZGVzX3N1cHBvcnRlZCI6WyJmb3JtX3Bvc3Quand0Il0sInJlc3BvbnNlX3R5cGVzX3N1cHBvcnRlZCI6WyJ2cF90b2tlbiJdLCJzdWIiOiJzOW9VSlBMbjBuMkptQVh6dW5vRGRFZVBqUzZvZW10TzNWLUdwLXBGVERRIiwidnBfZm9ybWF0c19zdXBwb3J0ZWQiOnsidmMrc2Qtand0Ijp7InNkLWp3dF9hbGdfdmFsdWVzIjpbIkVTMjU2IiwiRVMyNTZLIiwiRVMzODQiLCJFUzUxMiIsIlJTMjU2IiwiUlMzODQiLCJSUzUxMiIsIlBTMjU2IiwiUFMzODQiLCJQUzUxMiJdfSwidnArc2Qtand0Ijp7InNkLWp3dF9hbGdfdmFsdWVzIjpbIkVTMjU2IiwiRVMyNTZLIiwiRVMzODQiLCJFUzUxMiIsIlJTMjU2IiwiUlMzODQiLCJSUzUxMiIsIlBTMjU2IiwiUFMzODQiLCJQUzUxMiJdfX0sImlhdCI6MTczMjAwNDU3NywiZXhwIjoxNzMyMDA4MTc3fQ.qGwZfW1_t1wRhSrpUgdowHdzvf1c-6xjDqazEfh86aD9erzqkiroNiu1R1akAvBJQwZiSqiOt_GzdqIVn5Bqbw";

const wiaCryptoContext: CryptoContext = {
  getPublicKey: async () => ({
    crv: "P-256",
    kid: "s9oUJPLn0n2JmAXzunoDdEePjS6oemtO3V-Gp-pFTDQ",
    kty: "EC",
    x: "doI4arl7NML-PYtubUU_xZwTVqfAPZeDc-a1JLtHvdw",
    y: "PAucTD2j1Sd9u87eaobFlMRao_ORZpBaBakbeKa5R78",
  }),
  getSignature: async () => "",
};

describe("getCredentialTrustmarkJwt", () => {
  beforeEach(async () => {
    // Generate a fresh key before each test
    await generate("WIA_KEYTAG");
  });

  afterEach(async () => {
    jest.resetAllMocks();
    jest.clearAllMocks();
    jest.useRealTimers(); // Reset timers after each test
    await deleteKey("WIA_KEYTAG");
  });

  it("should generate a JWT with the correct payload", async () => {
    // Mock Date
    jest.useFakeTimers();
    jest.setSystemTime(new Date(1732004577000));

    const credentialType = "MDL";

    const { jwt, expirationTime } = await getCredentialTrustmark({
      walletInstanceAttestation,
      wiaCryptoContext,
      credentialType,
      docNumber: "1234567890",
      expirationTime: "2m",
    });

    const decoded = decode(jwt);
    expect(decoded.payload.iss).toBe(walletInstanceAttestation);
    expect(decoded.payload.sub).toContain("*");
    expect(decoded.payload.subtyp).toBe(credentialType);
    expect(expirationTime).toBe(1732004697);
  });

  it("should allow to configure expiration time", async () => {
    // Mock Date
    jest.useFakeTimers();
    jest.setSystemTime(new Date(1732004577000));

    const { expirationTime } = await getCredentialTrustmark({
      walletInstanceAttestation,
      wiaCryptoContext,
      credentialType: "MDL",
      docNumber: "1234567890",
      expirationTime: "10s",
    });
    expect(expirationTime).toBe(1732004587);
  });

  it("should allow to specify an exact expiration time", async () => {
    // Mock Date
    jest.useFakeTimers();
    jest.setSystemTime(new Date(1732004577000));

    const { expirationTime } = await getCredentialTrustmark({
      walletInstanceAttestation,
      wiaCryptoContext,
      credentialType: "MDL",
      docNumber: "1234567890",
      expirationTime: 1732004577,
    });
    expect(expirationTime).toBe(1732004577);
  });

  it("should throw error if wia is expired", async () => {
    // Mock Date
    jest.useFakeTimers();
    jest.setSystemTime(new Date(1832004577000));

    await expect(() =>
      getCredentialTrustmark({
        walletInstanceAttestation,
        wiaCryptoContext,
        credentialType: "MDL",
        docNumber: "1234567890",
        expirationTime: "2m",
      })
    ).rejects.toThrow();
  });

  it("should throw error if thumbprints do not match", async () => {
    const ephemeralKeytag = `ephemeral-${Math.random()}`;
    await generate(ephemeralKeytag);

    await expect(() =>
      getCredentialTrustmark({
        walletInstanceAttestation: "walletInstanceAttestation",
        wiaCryptoContext,
        credentialType: "MDL",
        docNumber: "1234567890",
      })
    ).rejects.toThrow();
  });
});
