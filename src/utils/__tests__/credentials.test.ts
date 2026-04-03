import { fixLegacyCredentialSdJwt } from "../credentials";

// Non-regression tests to ensure standard SD-JWTs are not modified by
// `fixLegacyCredentialSdJwt`, while legacy 0.7.1 SD-JWTs are correctly fixed
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
