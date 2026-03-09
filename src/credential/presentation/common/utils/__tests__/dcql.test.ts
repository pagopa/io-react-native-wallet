import type { DcqlQueryResult } from "dcql";
import type { NotFoundDetail } from "../../errors";
import {
  pathToPresentationFrame,
  extractFailedCredentialsDetails,
} from "../dcql";

describe("pathToPresentationFrame", () => {
  test.each([
    [["name"], { name: "Mario" }, { name: true }],
    [
      ["address", "country"],
      { address: { country: "Italy", city: "Roma" } },
      { address: { country: true } },
    ],
    [
      ["nested", "claim", "value"],
      { nested: { claim: { value: "something" } } },
      { nested: { claim: { value: true } } },
    ],
    [
      ["list", null],
      { list: ["a", "b", "c"] },
      { list: { 0: true, 1: true, 2: true } },
    ],
    [["list", 1], { list: ["a", "b", "c"] }, { list: { 1: true } }],
    [
      ["list", 0, "name"],
      {
        list: [
          { name: "A", surname: "B" },
          { name: "C", surname: "D" },
        ],
      },
      { list: { 0: { name: true } } },
    ],
    [
      ["list", null, "name"],
      {
        list: [
          { name: "A", surname: "B" },
          { name: "C", surname: "D" },
        ],
      },
      { list: { 0: { name: true }, 1: { name: true } } },
    ],
  ])("should handle path: %s", (path, claim, expected) => {
    expect(pathToPresentationFrame(path, claim)).toEqual(expected);
  });
});

describe("extractFailedCredentialsDetails", () => {
  it("should extract correct details for failed dc+sd-jwt credentials", () => {
    const queryResult: DcqlQueryResult = {
      credentials: [
        {
          id: "PersonIdentificationData",
          format: "dc+sd-jwt",
          multiple: false,
          require_cryptographic_holder_binding: true,
          meta: { vct_values: ["SomePID"] },
        },
      ],
      can_be_satisfied: false,
      credential_matches: {
        PersonIdentificationData: {
          success: false,
          credential_query_id: "PersonIdentificationData",
          failed_credentials: [
            {
              success: false,
              input_credential_index: 0,
              trusted_authorities: { success: true },
              meta: {
                success: false,
                issues: {
                  vct: [
                    "Expected vct to be 'SomePID' but received 'https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata'",
                  ],
                },
                output: {
                  credential_format: "dc+sd-jwt",
                  vct: "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
                  cryptographic_holder_binding: true,
                },
              },
              claims: {} as any,
            },
            {
              success: false,
              input_credential_index: 1,
              trusted_authorities: { success: true },
              meta: {
                success: false,
                issues: {
                  vct: ["Expected vct to be 'SomePID' but received 'MDL'"],
                },
                output: {
                  credential_format: "dc+sd-jwt",
                  vct: "MDL",
                  cryptographic_holder_binding: true,
                },
              },
              claims: {} as any,
            },
          ],
        },
      },
    };

    expect(extractFailedCredentialsDetails(queryResult)).toEqual<
      NotFoundDetail[]
    >([
      {
        id: "PersonIdentificationData",
        format: "dc+sd-jwt",
        vctValues: ["SomePID"],
        issues: [
          "Expected vct to be 'SomePID' but received 'https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata'",
          "Expected vct to be 'SomePID' but received 'MDL'",
        ],
      },
    ]);
  });
});
