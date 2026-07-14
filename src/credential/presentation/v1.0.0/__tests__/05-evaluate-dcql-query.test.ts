import { DcqlError, type DcqlQuery } from "dcql";

import { evaluateDcqlQuery } from "../06-evaluate-dcql-query";
import { legacyPid, mdl, pid } from "../../../../sd-jwt/__fixtures__/sd-jwt";
import {
  CredentialsNotFoundError,
  type NotFoundDetail,
} from "../../common/errors";

const pidKeyTag = "pidkeytag";
const mdlKeyTag = "mdlkeytag";

const credentials = [
  [pidKeyTag, pid],
  [mdlKeyTag, mdl],
] as [string, string][];

describe("evaluateDcqlQuery", () => {
  it("should throw error when the DCQL query structure is invalid", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          // @ts-expect-error invalid query on purpose
          claims: [{ id: "tax_id_code", path: "tax_id_code" }],
          format: "dc+sd-jwt",
          id: "PersonIdentificationData",
        },
      ],
    };

    await expect(() => evaluateDcqlQuery(query, credentials)).rejects.toThrow(
      DcqlError,
    );
  });

  it("should throw error when the DCQL is invalid", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          claim_sets: [["missing_claim", "tax_id_code"]],
          claims: [{ id: "tax_id_code", path: ["tax_id_code"] }],
          format: "dc+sd-jwt",
          id: "PersonIdentificationData",
        },
      ],
    };

    await expect(() => evaluateDcqlQuery(query, credentials)).rejects.toThrow(
      DcqlError,
    );
  });

  test.each([
    [
      {
        credentials: [
          {
            format: "dc+sd-jwt",
            id: "PersonIdentificationData",
            meta: {
              vct_values: ["MissingPID"],
            },
          },
        ],
      },
      [
        {
          format: "dc+sd-jwt",
          id: "PersonIdentificationData",
          issues: expect.any(Array),
          vctValues: ["MissingPID"],
        },
      ],
    ],
    [
      {
        credential_sets: [
          {
            options: [["PersonIdentificationData"]],
            purpose: "Identification",
            required: true,
          },
        ],
        credentials: [
          {
            format: "dc+sd-jwt",
            id: "PersonIdentificationData",
            meta: {
              vct_values: ["MissingPID"],
            },
          },
        ],
      },
      [
        {
          format: "dc+sd-jwt",
          id: "PersonIdentificationData",
          issues: expect.any(Array),
          vctValues: ["MissingPID"],
        },
      ],
    ],
    [
      {
        credential_sets: [
          {
            options: [["IHaveThis", "IDontHaveThis"]],
            purpose: "Identification",
            required: true,
          },
        ],
        credentials: [
          {
            format: "dc+sd-jwt",
            id: "IHaveThis",
            meta: {
              vct_values: [
                "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
              ],
            },
          },
          {
            format: "dc+sd-jwt",
            id: "IDontHaveThis",
            meta: {
              vct_values: ["MissingCredential"],
            },
          },
        ],
      },
      [
        {
          format: "dc+sd-jwt",
          id: "IDontHaveThis",
          issues: expect.any(Array),
          vctValues: ["MissingCredential"],
        },
      ],
    ],
  ] as [DcqlQuery.Input, NotFoundDetail[]][])(
    "should throw error when no credential satisfies the DCQL query /%#",
    async (dcqlQuery, expected) => {
      try {
        await evaluateDcqlQuery(dcqlQuery, credentials);
      } catch (err) {
        expect(err).toBeInstanceOf(CredentialsNotFoundError);
        expect((err as CredentialsNotFoundError).details).toEqual(expected);
      }
    },
  );

  it("should work correctly with a simple query", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          claims: [
            { path: ["tax_id_code"] },
            { path: ["given_name"] },
            { path: ["family_name"] },
          ],
          format: "dc+sd-jwt",
          id: "PID",
          meta: {
            vct_values: [
              "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
            ],
          },
        },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        credential: pid,
        format: "dc+sd-jwt",
        id: "PID",
        keyTag: pidKeyTag,
        presentationFrame: {
          family_name: true,
          given_name: true,
          tax_id_code: true,
        },
        purposes: [{ required: true }],
        requiredDisclosures: [
          { name: "tax_id_code", value: "LVLDAA85T50G702B" },
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
        vct: "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with multiple simple queries", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          claims: [
            { path: ["tax_id_code"] },
            { path: ["given_name"] },
            { path: ["family_name"] },
          ],
          format: "dc+sd-jwt",
          id: "PID",
          meta: {
            vct_values: [
              "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
            ],
          },
        },
        {
          claims: [{ path: ["document_number"] }],
          format: "dc+sd-jwt",
          id: "DrivingLicense",
          meta: {
            vct_values: ["MDL"],
          },
        },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        credential: pid,
        format: "dc+sd-jwt",
        id: "PID",
        keyTag: pidKeyTag,
        presentationFrame: {
          family_name: true,
          given_name: true,
          tax_id_code: true,
        },
        purposes: [{ required: true }],
        requiredDisclosures: [
          { name: "tax_id_code", value: "LVLDAA85T50G702B" },
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
        vct: "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
      },
      {
        credential: mdl,
        format: "dc+sd-jwt",
        id: "DrivingLicense",
        keyTag: mdlKeyTag,
        presentationFrame: { document_number: true },
        purposes: [{ required: true }],
        requiredDisclosures: [{ name: "document_number", value: "123456789" }],
        vct: "MDL",
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with missing optional credentials", async () => {
    const query: DcqlQuery.Input = {
      credential_sets: [
        { options: [["PID"]], purpose: "Identification", required: true },
        { options: [["optional"]], purpose: "Extra services", required: false },
      ],
      credentials: [
        {
          claims: [{ path: ["given_name"] }, { path: ["family_name"] }],
          format: "dc+sd-jwt",
          id: "PID",
          meta: {
            vct_values: [
              "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
            ],
          },
        },
        {
          claims: [{ path: ["telephone"] }],
          format: "dc+sd-jwt",
          id: "optional",
          meta: {
            vct_values: ["other_credential"],
          },
        },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        credential: pid,
        format: "dc+sd-jwt",
        id: "PID",
        keyTag: pidKeyTag,
        presentationFrame: { family_name: true, given_name: true },
        purposes: [{ description: "Identification", required: true }],
        requiredDisclosures: [
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
        vct: "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with available optional credentials", async () => {
    const query: DcqlQuery.Input = {
      credential_sets: [
        { options: [["PID"]], purpose: "Identification", required: true },
        { options: [["MDL"]], purpose: "Extra services", required: false },
      ],
      credentials: [
        {
          claims: [{ path: ["given_name"] }, { path: ["family_name"] }],
          format: "dc+sd-jwt",
          id: "PID",
          meta: {
            vct_values: [
              "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
            ],
          },
        },
        {
          claims: [{ id: "document_number", path: ["document_number"] }],
          format: "dc+sd-jwt",
          id: "MDL",
          meta: {
            vct_values: ["MDL"],
          },
        },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        credential: pid,
        format: "dc+sd-jwt",
        id: "PID",
        keyTag: pidKeyTag,
        presentationFrame: { family_name: true, given_name: true },
        purposes: [{ description: "Identification", required: true }],
        requiredDisclosures: [
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
        vct: "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
      },
      {
        credential: mdl,
        format: "dc+sd-jwt",
        id: "MDL",
        keyTag: mdlKeyTag,
        presentationFrame: { document_number: true },
        purposes: [{ description: "Extra services", required: false }],
        requiredDisclosures: [{ name: "document_number", value: "123456789" }],
        vct: "MDL",
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with a complex query", async () => {
    const query: DcqlQuery.Input = {
      credential_sets: [
        {
          options: [["PID", "MDL"]],
          purpose: "Identification",
          required: true,
        },
        { options: [["optional"]], purpose: "Extra services", required: false },
      ],
      credentials: [
        {
          claims: [
            { path: ["tax_id_code"] },
            { path: ["given_name"] },
            { path: ["family_name"] },
          ],
          format: "dc+sd-jwt",
          id: "PID",
          meta: {
            vct_values: [
              "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
            ],
          },
        },
        {
          claim_sets: [
            ["driving_privileges", "driving_privileges_details"],
            ["birth_date", "document_number"],
          ],
          claims: [
            { id: "document_number", path: ["document_number"] },
            { id: "birth_date", path: ["birth_date"] },
            { id: "driving_privileges", path: ["driving_privileges"] },
            {
              id: "driving_privileges_details",
              path: ["driving_privileges_details"],
            },
          ],
          format: "dc+sd-jwt",
          id: "MDL",
          meta: {
            vct_values: ["MDL"],
          },
        },
        {
          claims: [{ path: ["telephone"] }],
          format: "dc+sd-jwt",
          id: "optional",
          meta: {
            vct_values: ["other_credential"],
          },
        },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        credential: pid,
        format: "dc+sd-jwt",
        id: "PID",
        keyTag: pidKeyTag,
        presentationFrame: {
          family_name: true,
          given_name: true,
          tax_id_code: true,
        },
        purposes: [{ description: "Identification", required: true }],
        requiredDisclosures: [
          { name: "tax_id_code", value: "LVLDAA85T50G702B" },
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
        vct: "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
      },
      {
        credential: mdl,
        format: "dc+sd-jwt",
        id: "MDL",
        keyTag: mdlKeyTag,
        presentationFrame: { birth_date: true, document_number: true },
        purposes: [{ description: "Identification", required: true }],
        requiredDisclosures: [
          { name: "birth_date", value: "01-01-1990" },
          { name: "document_number", value: "123456789" },
        ],
        vct: "MDL",
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with multiple matching credential_sets", async () => {
    const query: DcqlQuery.Input = {
      credential_sets: [
        {
          options: [["PID", "MDL"]],
          purpose: "Identification",
        },
        { options: [["MDL"]], purpose: "Extra services", required: false },
      ],
      credentials: [
        {
          claims: [
            { path: ["tax_id_code"] },
            { path: ["given_name"] },
            { path: ["family_name"] },
          ],
          format: "dc+sd-jwt",
          id: "PID",
          meta: {
            vct_values: [
              "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
            ],
          },
        },
        {
          claims: [
            { path: ["document_number"] },
            { path: ["birth_date"] },
            { path: ["driving_privileges"] },
          ],
          format: "dc+sd-jwt",
          id: "MDL",
          meta: {
            vct_values: ["MDL"],
          },
        },
        {
          claims: [{ path: ["telephone"] }],
          format: "dc+sd-jwt",
          id: "optional",
          meta: {
            vct_values: ["other_credential"],
          },
        },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        credential: pid,
        format: "dc+sd-jwt",
        id: "PID",
        keyTag: pidKeyTag,
        presentationFrame: {
          family_name: true,
          given_name: true,
          tax_id_code: true,
        },
        purposes: [{ description: "Identification", required: true }],
        requiredDisclosures: [
          { name: "tax_id_code", value: "LVLDAA85T50G702B" },
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
        vct: "https://pre.ta.wallet.ipzs.it/vct/v1.0.0/personidentificationdata",
      },
      {
        credential: mdl,
        format: "dc+sd-jwt",
        id: "MDL",
        keyTag: mdlKeyTag,
        presentationFrame: {
          birth_date: true,
          document_number: true,
          driving_privileges: true,
        },
        purposes: [
          { description: "Identification", required: true },
          { description: "Extra services", required: false },
        ],
        requiredDisclosures: [
          { name: "document_number", value: "123456789" },
          { name: "birth_date", value: "01-01-1990" },
          {
            name: "driving_privileges",
            value: [
              {
                expiry_date: "2032-09-02",
                issue_date: "2015-08-19",
                vehicle_category_code: "AM",
              },
              {
                codes: [{ code: "01", sign: "02", value: "Guida con lenti" }],
                expiry_date: "2033-04-17",
                issue_date: "2015-07-11",
                vehicle_category_code: "B",
              },
            ],
          },
        ],
        vct: "MDL",
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work with older vc+sd-jwt credentials", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          claims: [{ path: ["tax_id_code"] }],
          format: "vc+sd-jwt",
          id: "PID",
          meta: {
            vct_values: ["PersonIdentificationData"],
          },
        },
      ],
    };

    const legacyCredentials = [[pidKeyTag, legacyPid]] as [string, string][];
    const result = await evaluateDcqlQuery(query, legacyCredentials);

    const expected = [
      {
        credential: legacyPid,
        format: "vc+sd-jwt",
        id: "PID",
        keyTag: pidKeyTag,
        presentationFrame: { tax_id_code: true },
        purposes: [{ required: true }],
        requiredDisclosures: [
          { name: "tax_id_code", value: "TINIT-LVLDAA85T50G702B" },
        ],
        vct: "PersonIdentificationData",
      },
    ];

    expect(result).toEqual(expected);
  });
});
