import { fixLegacyCredentialSdJwt } from "../credentials";

describe("fixLegacyCredentialSdJwt", () => {
  it.each([
    [
      "header.payload.signature~disc1~disc2~",
      "header.payload.signature~disc1~disc2~",
    ],
    [
      "header.payload.signature~disc1~disc2",
      "header.payload.signature~disc1~disc2~",
    ],
    [
      "header.payload.signature~disc1~disc2~key.binding.jwt",
      "header.payload.signature~disc1~disc2~key.binding.jwt",
    ],
  ])("should fix legacy credentials SD-JWT (%#)", (input, expected) => {
    expect(fixLegacyCredentialSdJwt(input)).toEqual(expected);
  });
});
