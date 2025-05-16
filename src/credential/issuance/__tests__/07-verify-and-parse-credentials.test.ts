import { IoWalletError } from "../../../utils/errors";
import "../07-verify-and-parse-credential";
import {
  parseCredentialMDoc,
  parseCredentialSdJwt,
} from "../07-verify-and-parse-credential";
import { mocks } from "./utils/07-verify-and-parse-credentials-mocks";

describe("parsingScenarios", () => {
  it.each(mocks.map((s, index) => [`${index} : ${s.name}`, s]))(
    "should parse without optional claims or throw if a mandatory claim is not found; %s",
    (_, scenario) => {
      if (scenario.throws) {
        expect(() => {
          if (scenario.input.format === "vc+sd-jwt") {
            parseCredentialSdJwt(...scenario.input.parameters);
          } else {
            parseCredentialMDoc(...scenario.input.parameters);
          }
        }).toThrow(IoWalletError);
      } else {
        if (scenario.input.format === "vc+sd-jwt") {
          expect(parseCredentialSdJwt(...scenario.input.parameters)).toEqual(
            scenario.expected
          );
        } else {
          expect(parseCredentialMDoc(...scenario.input.parameters)).toEqual(
            scenario.expected
          );
        }
      }
    }
  );
});
