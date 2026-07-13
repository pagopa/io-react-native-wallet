import { getVerification } from "..";
import { legacyPid, pid } from "../__mocks__/sd-jwt";

describe("SD-JWT getVerification", () => {
  it("extracts the verification claims correctly", () => {
    expect(getVerification(pid)).toEqual({
      assurance_level: "high",
      trust_framework: "it_cie",
    });
  });

  it("returns undefined when the verification claim is not found", () => {
    expect(getVerification(legacyPid)).toBeUndefined();
  });
});
