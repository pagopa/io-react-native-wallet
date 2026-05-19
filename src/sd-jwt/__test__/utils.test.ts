import { legacyPid, pid } from "../__mocks__/sd-jwt";
import { getVerification } from "..";

describe("SD-JWT getVerification", () => {
  it("extracts the verification claims correctly", () => {
    expect(getVerification(pid)).toEqual({
      trust_framework: "it_cie",
      assurance_level: "high",
    });
  });

  it("returns undefined when the verification claim is not found", () => {
    expect(getVerification(legacyPid)).toBeUndefined();
  });
});
