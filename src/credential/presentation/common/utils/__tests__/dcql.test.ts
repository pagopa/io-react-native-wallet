import type { DcqlQueryResult } from "dcql";

import type { NotFoundDetail } from "../../errors";

import {
  extractFailedCredentialsDetails,
  pathToPresentationFrame,
} from "../dcql";

describe("pathToPresentationFrame", () => {
  test.each([
    [["name"], { name: "Mario" }, { name: true }],
    [
      ["address", "country"],
      { address: { city: "Roma", country: "Italy" } },
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
      can_be_satisfied: false,
      credential_matches: {
        PersonIdentificationData: {
          credential_query_id: "PersonIdentificationData",
          failed_credentials: [
            {
              claims: {} as any,
              input_credential_index: 0,
              meta: {
                issues: {
                  vct: [
                    "Expected vct to be 'SomePID' but received 'https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata'",
                  ],
                },
                output: {
                  credential_format: "dc+sd-jwt",
                  cryptographic_holder_binding: true,
                  vct: "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
                },
                success: false,
              },
              success: false,
              trusted_authorities: { success: true },
            },
            {
              claims: {} as any,
              input_credential_index: 1,
              meta: {
                issues: {
                  vct: ["Expected vct to be 'SomePID' but received 'MDL'"],
                },
                output: {
                  credential_format: "dc+sd-jwt",
                  cryptographic_holder_binding: true,
                  vct: "MDL",
                },
                success: false,
              },
              success: false,
              trusted_authorities: { success: true },
            },
          ],
          success: false,
        },
      },
      credentials: [
        {
          format: "dc+sd-jwt",
          id: "PersonIdentificationData",
          meta: { vct_values: ["SomePID"] },
          multiple: false,
          require_cryptographic_holder_binding: true,
        },
      ],
    };

    expect(extractFailedCredentialsDetails(queryResult)).toEqual<
      NotFoundDetail[]
    >([
      {
        format: "dc+sd-jwt",
        id: "PersonIdentificationData",
        issues: [
          "Expected vct to be 'SomePID' but received 'https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata'",
          "Expected vct to be 'SomePID' but received 'MDL'",
        ],
        vctValues: ["SomePID"],
      },
    ]);
  });
});
