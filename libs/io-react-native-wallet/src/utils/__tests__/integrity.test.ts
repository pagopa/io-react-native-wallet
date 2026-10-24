import { toIntegrityClaims } from "../integrity";

describe("toIntegrityClaims", () => {
  it("should map both integrity proofs", () => {
    expect(
      toIntegrityClaims({
        authenticatorData: "play-integrity-token",
        hardwareKeyAttestation: "key-attestation",
        signature: "signature",
      }),
    ).toEqual({
      hardware_key_attestation: "key-attestation",
      integrity_assertion: "play-integrity-token",
    });
  });

  it("should omit the missing integrity proofs", () => {
    expect(
      toIntegrityClaims({
        authenticatorData: "ios-assertion",
        signature: "signature",
      }),
    ).toEqual({ integrity_assertion: "ios-assertion" });
    expect(
      toIntegrityClaims({
        authenticatorData: "",
        hardwareKeyAttestation: "key-attestation",
        signature: "signature",
      }),
    ).toEqual({ hardware_key_attestation: "key-attestation" });
  });
});
