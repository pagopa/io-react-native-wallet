import { DcqlError, type DcqlQuery } from "dcql";
import { evaluateDcqlQuery } from "../07-evaluate-dcql-query";
import { CredentialsNotFoundError, type NotFoundDetail } from "../errors";
import { pid, mdl } from "../../../sd-jwt/__mocks__/sd-jwt";

const pidKeyTag = "pidkeytag";
const mdlKeyTag = "mdlkeytag";

const credentials = [
  [pidKeyTag, pid.token],
  [mdlKeyTag, mdl.token],
] as [string, string][];

describe("evaluateDcqlQuery", () => {
  it("should throw error when the DCQL query structure is invalid", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PersonIdentificationData",
          format: "dc+sd-jwt",
          // @ts-expect-error invalid query on purpose
          claims: [{ id: "tax_id_code", path: "tax_id_code" }],
        },
      ],
    };

    await expect(() => evaluateDcqlQuery(query, credentials)).rejects.toThrow(
      DcqlError
    );
  });

  it("should throw error when the DCQL is invalid", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PersonIdentificationData",
          format: "dc+sd-jwt",
          claims: [{ id: "tax_id_code", path: ["tax_id_code"] }],
          claim_sets: [["missing_claim", "tax_id_code"]],
        },
      ],
    };

    await expect(() => evaluateDcqlQuery(query, credentials)).rejects.toThrow(
      DcqlError
    );
  });

  test.each([
    [
      {
        credentials: [
          {
            id: "PersonIdentificationData",
            format: "dc+sd-jwt",
            meta: {
              vct_values: ["MissingPID"],
            },
          },
        ],
      },
      [{ id: "PersonIdentificationData", issues: expect.any(Array) }],
    ],
    [
      {
        credentials: [
          {
            id: "PersonIdentificationData",
            format: "dc+sd-jwt",
            meta: {
              vct_values: ["MissingPID"],
            },
          },
        ],
        credential_sets: [
          {
            options: [["PersonIdentificationData"]],
            purpose: "Identification",
            required: true,
          },
        ],
      },
      [{ id: "PersonIdentificationData", issues: expect.any(Array) }],
    ],
    [
      {
        credentials: [
          {
            id: "IHaveThis",
            format: "dc+sd-jwt",
            meta: {
              vct_values: ["PersonIdentificationData"],
            },
          },
          {
            id: "IDontHaveThis",
            format: "dc+sd-jwt",
            meta: {
              vct_values: ["MissingCredential"],
            },
          },
        ],
        credential_sets: [
          {
            options: [["IHaveThis", "IDontHaveThis"]],
            purpose: "Identification",
            required: true,
          },
        ],
      },
      [{ id: "IDontHaveThis", issues: expect.any(Array) }],
    ],
  ] as Array<[DcqlQuery.Input, Array<NotFoundDetail>]>)(
    "should throw error when no credential satisfies the DCQL query /%#",
    async (dcqlQuery, expected) => {
      try {
        await evaluateDcqlQuery(dcqlQuery, credentials);
      } catch (err) {
        expect(err).toBeInstanceOf(CredentialsNotFoundError);
        expect((err as CredentialsNotFoundError).details).toEqual(expected);
      }
    }
  );

  it("should work correctly with a simple query", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PID",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["PersonIdentificationData"],
          },
          claims: [
            { path: ["tax_id_code"] },
            { path: ["given_name"] },
            { path: ["family_name"] },
          ],
        },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        id: "PID",
        format: "dc+sd-jwt",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pid.token,
        purposes: [{ required: true }],
        presentationFrame: {
          tax_id_code: true,
          given_name: true,
          family_name: true,
        },
        requiredDisclosures: [
          { name: "tax_id_code", value: "TINIT-LVLDAA85T50G702B" },
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with multiple simple queries", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PID",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["PersonIdentificationData"],
          },
          claims: [
            { path: ["tax_id_code"] },
            { path: ["given_name"] },
            { path: ["family_name"] },
          ],
        },
        {
          id: "DrivingLicense",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["MDL"],
          },
          claims: [{ path: ["document_number"] }],
        },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        id: "PID",
        format: "dc+sd-jwt",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pid.token,
        purposes: [{ required: true }],
        presentationFrame: {
          tax_id_code: true,
          given_name: true,
          family_name: true,
        },
        requiredDisclosures: [
          { name: "tax_id_code", value: "TINIT-LVLDAA85T50G702B" },
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
      },
      {
        id: "DrivingLicense",
        format: "dc+sd-jwt",
        vct: "MDL",
        keyTag: mdlKeyTag,
        credential: mdl.token,
        purposes: [{ required: true }],
        presentationFrame: { document_number: true },
        requiredDisclosures: [{ name: "document_number", value: "123456789" }],
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with missing optional credentials", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PID",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["PersonIdentificationData"],
          },
          claims: [{ path: ["given_name"] }, { path: ["family_name"] }],
        },
        {
          id: "optional",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["other_credential"],
          },
          claims: [{ path: ["telephone"] }],
        },
      ],
      credential_sets: [
        { options: [["PID"]], purpose: "Identification", required: true },
        { options: [["optional"]], purpose: "Extra services", required: false },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        id: "PID",
        format: "dc+sd-jwt",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pid.token,
        purposes: [{ description: "Identification", required: true }],
        presentationFrame: { given_name: true, family_name: true },
        requiredDisclosures: [
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with available optional credentials", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PID",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["PersonIdentificationData"],
          },
          claims: [{ path: ["given_name"] }, { path: ["family_name"] }],
        },
        {
          id: "MDL",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["MDL"],
          },
          claims: [{ id: "document_number", path: ["document_number"] }],
        },
      ],
      credential_sets: [
        { options: [["PID"]], purpose: "Identification", required: true },
        { options: [["MDL"]], purpose: "Extra services", required: false },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        id: "PID",
        format: "dc+sd-jwt",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pid.token,
        purposes: [{ description: "Identification", required: true }],
        presentationFrame: { given_name: true, family_name: true },
        requiredDisclosures: [
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
      },
      {
        id: "MDL",
        format: "dc+sd-jwt",
        vct: "MDL",
        keyTag: mdlKeyTag,
        credential: mdl.token,
        purposes: [{ description: "Extra services", required: false }],
        presentationFrame: { document_number: true },
        requiredDisclosures: [{ name: "document_number", value: "123456789" }],
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with a complex query", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PID",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["PersonIdentificationData"],
          },
          claims: [
            { path: ["tax_id_code"] },
            { path: ["given_name"] },
            { path: ["family_name"] },
          ],
        },
        {
          id: "MDL",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["MDL"],
          },
          claims: [
            { id: "document_number", path: ["document_number"] },
            { id: "birth_date", path: ["birth_date"] },
            { id: "driving_privileges", path: ["driving_privileges"] },
            {
              id: "driving_privileges_details",
              path: ["driving_privileges_details"],
            },
          ],
          claim_sets: [
            ["driving_privileges", "driving_privileges_details"],
            ["birth_date", "document_number"],
          ],
        },
        {
          id: "optional",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["other_credential"],
          },
          claims: [{ path: ["telephone"] }],
        },
      ],
      credential_sets: [
        {
          options: [["PID", "MDL"]],
          purpose: "Identification",
          required: true,
        },
        { options: [["optional"]], purpose: "Extra services", required: false },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        id: "PID",
        format: "dc+sd-jwt",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pid.token,
        purposes: [{ description: "Identification", required: true }],
        presentationFrame: {
          tax_id_code: true,
          given_name: true,
          family_name: true,
        },
        requiredDisclosures: [
          { name: "tax_id_code", value: "TINIT-LVLDAA85T50G702B" },
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
      },
      {
        id: "MDL",
        format: "dc+sd-jwt",
        vct: "MDL",
        keyTag: mdlKeyTag,
        credential: mdl.token,
        purposes: [{ description: "Identification", required: true }],
        presentationFrame: { birth_date: true, document_number: true },
        requiredDisclosures: [
          { name: "birth_date", value: "01-01-1990" },
          { name: "document_number", value: "123456789" },
        ],
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with multiple matching credential_sets", async () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PID",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["PersonIdentificationData"],
          },
          claims: [
            { path: ["tax_id_code"] },
            { path: ["given_name"] },
            { path: ["family_name"] },
          ],
        },
        {
          id: "MDL",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["MDL"],
          },
          claims: [
            { path: ["document_number"] },
            { path: ["birth_date"] },
            { path: ["driving_privileges"] },
          ],
        },
        {
          id: "optional",
          format: "dc+sd-jwt",
          meta: {
            vct_values: ["other_credential"],
          },
          claims: [{ path: ["telephone"] }],
        },
      ],
      credential_sets: [
        {
          options: [["PID", "MDL"]],
          purpose: "Identification",
        },
        { options: [["MDL"]], purpose: "Extra services", required: false },
      ],
    };

    const result = await evaluateDcqlQuery(query, credentials);
    const expected = [
      {
        id: "PID",
        format: "dc+sd-jwt",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pid.token,
        purposes: [{ description: "Identification", required: true }],
        presentationFrame: {
          tax_id_code: true,
          given_name: true,
          family_name: true,
        },
        requiredDisclosures: [
          { name: "tax_id_code", value: "TINIT-LVLDAA85T50G702B" },
          { name: "given_name", value: "Ada" },
          { name: "family_name", value: "Lovelace" },
        ],
      },
      {
        id: "MDL",
        format: "dc+sd-jwt",
        vct: "MDL",
        keyTag: mdlKeyTag,
        credential: mdl.token,
        purposes: [
          { description: "Identification", required: true },
          { description: "Extra services", required: false },
        ],
        presentationFrame: {
          document_number: true,
          birth_date: true,
          driving_privileges: true,
        },
        requiredDisclosures: [
          { name: "document_number", value: "123456789" },
          { name: "birth_date", value: "01-01-1990" },
          {
            name: "driving_privileges",
            value: [
              {
                issue_date: "2015-08-19",
                vehicle_category_code: "AM",
                expiry_date: "2032-09-02",
              },
              {
                issue_date: "2015-07-11",
                vehicle_category_code: "B",
                expiry_date: "2033-04-17",
                codes: [{ code: "01", sign: "02", value: "Guida con lenti" }],
              },
            ],
          },
        ],
      },
    ];

    expect(result).toEqual(expected);
  });
});
