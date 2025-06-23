import { DcqlError, type DcqlQuery } from "dcql";
import { evaluateDcqlQuery } from "../07-evaluate-dcql-query";
import { CredentialsNotFoundError, type NotFoundDetail } from "../errors";

const pidKeyTag = "pidkeytag";
const pidSdJwt =
  "eyJraWQiOiItRl82VWdhOG4zVmVnalkyVTdZVUhLMXpMb2FELU5QVGM2M1JNSVNuTGF3IiwidHlwIjoiZGMrc2Qtand0IiwiYWxnIjoiRVMyNTYifQ.eyJfc2QiOlsiMHExRDVKbWF2NnBRYUVoX0pfRmN2X3VOTk1RSWdDeWhRT3hxbFk0bDNxVSIsIktDSi1BVk52ODhkLXhqNnNVSUFPSnhGbmJVaDNySFhES2tJSDFsRnFiUnMiLCJNOWxvOVl4RE5JWHJBcTJxV2VpQ0E0MHpwSl96WWZGZFJfNEFFQUxjUnRVIiwiY3pnalVrMG5xUkNzd1NoQ2hDamRTNkExLXY0N2RfcVRDU0ZJdklIaE1vSSIsIm5HblFyN2NsbTN0ZlRwOHlqTF91SHJEU090elIyUFZiOFM3R2VMZEFxQlEiLCJ4TklWd2xwU3NhWjhDSlNmMGd6NXhfNzVWUldXYzZWMW1scGVqZENycVVzIl0sInN1YiI6IjIxNmY4OTQ2LTllY2ItNDgxOS05MzA5LWMwNzZmMzRhN2UxMSIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwiaXNzIjoiaHR0cHM6Ly9wcmUuZWlkLndhbGxldC5pcHpzLml0IiwidmN0I2ludGVncml0eSI6IjEzZTI1ODg4YWM3YjhhM2E2ZDYxNDQwZGE3ODdmY2NjODE2NTRlNjEwODU3MzJiY2FjZDg5YjM2YWVjMzI2NzUiLCJpc3N1aW5nX2NvdW50cnkiOiJJVCIsImlzc3VpbmdfYXV0aG9yaXR5IjoiSXN0aXR1dG8gUG9saWdyYWZpY28gZSBaZWNjYSBkZWxsbyBTdGF0byIsImNuZiI6eyJqd2siOnsia3R5IjoiRUMiLCJjcnYiOiJQLTI1NiIsImtpZCI6IlJ2M1ctRWlLcHZCVHlrNXlaeHZyZXYtN01EQjZTbHpVQ0JvX0NRampkZFUiLCJ4IjoiMFdveDdRdHlQcUJ5ZzM1TUhfWHlDY25kNUxlLUptMEFYSGxVZ0RCQTAzWSIsInkiOiJlRWhWdmcxSlBxTmQzRFRTYTRtR0RHQmx3WTZOUC1FWmJMYk5GWFNYd0lnIn19LCJleHAiOjE3NTE1NDY1NzYsInN0YXR1cyI6eyJzdGF0dXNfYXNzZXJ0aW9uIjp7ImNyZWRlbnRpYWxfaGFzaF9hbGciOiJzaGEtMjU2In19fQ.PcFCMtY9u0_oeGFPj9KiTTKV6UyOQ-Rh_HevKAnsXUTvSV0cQWbUaPEuoIZJhWz6IJxzCctXh-xjxV4PK-5HrQ~WyJrSkRFUDhFYU5URU1CRE9aelp6VDR3IiwidW5pcXVlX2lkIiwiVElOSVQtTFZMREFBODVUNTBHNzAyQiJd~WyJ6SUF5VUZ2UGZJcEUxekJxeEk1aGFRIiwiYmlydGhfZGF0ZSIsIjE5ODUtMTItMTAiXQ~WyJHcjNSM3MyOTBPa1FVbS1ORlR1OTZBIiwidGF4X2lkX2NvZGUiLCJUSU5JVC1MVkxEQUE4NVQ1MEc3MDJCIl0~WyJHeE9SYWxNQWVsZlowZWRGSmpqWVV3IiwiZ2l2ZW5fbmFtZSIsIkFkYSJd~WyJfdlY1UklrbDBJT0VYS290czlrdDF3IiwiZmFtaWx5X25hbWUiLCJMb3ZlbGFjZSJd~WyJDajV0Y2NSNzJKd3J6ZTJUVzRhLXdnIiwiaWF0IiwxNzIwMDEwNTc1XQ";
const mdlKeyTag = "mdlkeytag";
const mdlSdJwt =
  "eyJraWQiOiItRl82VWdhOG4zVmVnalkyVTdZVUhLMXpMb2FELU5QVGM2M1JNSVNuTGF3IiwidHlwIjoiZGMrc2Qtand0IiwiYWxnIjoiRVMyNTYifQ.eyJfc2QiOlsiMFoydnRJaFdXdU44azV2VmtyOHlQY21kRHg2LUZFNjNKNldvSGFSRThvMCIsIkxmUk94YlRrWUQzbnFyTXQ5eHFxSHhvZTYyOTB4ekUtZzJuMVZPOTFheEkiLCJRQVZiek9uQl9hbUpxQ3ZiWVhTQ0RhSFNjSURWZmpPcjA4aWpHckFKZjFBIiwiVnNmMEkxNXZpRXp4VlZRTTQwaVRUSHdqQWJMWW9qdFk0eVBod0RjOC03TSIsIlpYeXlhMDAxcW5RUnpOWE9jMlFReEVfNExwRkkzUldVVzdYc1VtUmI5U3MiLCJhQmltTGFSWDltblpESW8xVDAtQ0Q1RC1jeWVWVGVoYXJQR3BCb0RiU3YwIl0sInN1YiI6IjIxNmY4OTQ2LTllY2ItNDgxOS05MzA5LWMwNzZmMzRhN2UxMSIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoiTURMIiwiaXNzIjoiaHR0cHM6Ly9wcmUuZWlkLndhbGxldC5pcHpzLml0IiwidmN0I2ludGVncml0eSI6IjFiODViYTU3ZWUyMWUxMjdmNzAyYWViYzAzMGU3M2EzZmYzNzE2NzUxZDAyN2ZlNmRhM2NkM2FlOTgwZDY3NjkiLCJpc3N1aW5nX2NvdW50cnkiOiJJVCIsImlzc3VpbmdfYXV0aG9yaXR5IjoiSXN0aXR1dG8gUG9saWdyYWZpY28gZSBaZWNjYSBkZWxsbyBTdGF0byIsImNuZiI6eyJqd2siOnsia3R5IjoiRUMiLCJjcnYiOiJQLTI1NiIsImtpZCI6IlJ2M1ctRWlLcHZCVHlrNXlaeHZyZXYtN01EQjZTbHpVQ0JvX0NRampkZFUiLCJ4IjoiMFdveDdRdHlQcUJ5ZzM1TUhfWHlDY25kNUxlLUptMEFYSGxVZ0RCQTAzWSIsInkiOiJlRWhWdmcxSlBxTmQzRFRTYTRtR0RHQmx3WTZOUC1FWmJMYk5GWFNYd0lnIn19LCJleHAiOjE3NTE1NDY1NzYsInN0YXR1cyI6eyJzdGF0dXNfYXNzZXJ0aW9uIjp7ImNyZWRlbnRpYWxfaGFzaF9hbGciOiJzaGEtMjU2In19fQ.9cVZoD5fBVmQqs-iXo_lpUMh5kz91DEW2SKFEzaxFh5CRt6Sn5PrEYSujsC6lbuPZwmSsmjRgerSVgEdkhywJQ~WyJmZjAwNmU0MTExYzA4NmMyIiwiZmFtaWx5X25hbWUiLCJSb3NzaSJd~WyI4MDY5MjI3MjZlM2VhY2VkIiwiZ2l2ZW5fbmFtZSIsIk1hcmlvIl0~WyI4MmZiZWVjNmQ1NzhmZjJlIiwiYmlydGhfZGF0ZSIsIjAxLTAxLTE5OTAiXQ~WyI0ZDEwYmE2MTVlZDYzYTEyIiwiZG9jdW1lbnRfbnVtYmVyIiwiMTIzNDU2Nzg5Il0~WyJjNGI0MGVmYWRmY2QzYmRkIiwiZHJpdmluZ19wcml2aWxlZ2VzIiwiQiJd~WyJiZTdmZjg4M2I4ZDJiYzE1IiwicGxhY2Vfb2ZfYmlydGgiLCJSb21hIl0~";

const credentials = [
  [pidKeyTag, pidSdJwt],
  [mdlKeyTag, mdlSdJwt],
] as [string, string][];

describe("evaluateDcqlQuery", () => {
  it("should throw error when the DCQL query structure is invalid", () => {
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

    expect(() => evaluateDcqlQuery(credentials, query)).toThrowError(DcqlError);
  });

  it("should throw error when the DCQL is invalid", () => {
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

    expect(() => evaluateDcqlQuery(credentials, query)).toThrowError(DcqlError);
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
      [{ id: "PersonIdentificationData", vctValues: ["MissingPID"] }],
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
      [{ id: "PersonIdentificationData", vctValues: ["MissingPID"] }],
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
      [{ id: "IDontHaveThis", vctValues: ["MissingCredential"] }],
    ],
  ] as Array<[DcqlQuery.Input, Array<NotFoundDetail>]>)(
    "should throw error when no credential satisfies the DCQL query /%#",
    (dcqlQuery, expected) => {
      try {
        evaluateDcqlQuery(credentials, dcqlQuery);
      } catch (err) {
        expect(err).toBeInstanceOf(CredentialsNotFoundError);
        expect((err as CredentialsNotFoundError).details).toEqual(expected);
      }
    }
  );

  it("should work correctly with a simple query", () => {
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

    const result = evaluateDcqlQuery(credentials, query);
    const expected = [
      {
        id: "PID",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pidSdJwt,
        purposes: [{ required: true }],
        requiredDisclosures: [
          ["Gr3R3s290OkQUm-NFTu96A", "tax_id_code", "TINIT-LVLDAA85T50G702B"],
          ["GxORalMAelfZ0edFJjjYUw", "given_name", "Ada"],
          ["_vV5RIkl0IOEXKots9kt1w", "family_name", "Lovelace"],
        ],
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with multiple simple queries", () => {
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

    const result = evaluateDcqlQuery(credentials, query);
    const expected = [
      {
        id: "PID",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pidSdJwt,
        purposes: [{ required: true }],
        requiredDisclosures: [
          ["Gr3R3s290OkQUm-NFTu96A", "tax_id_code", "TINIT-LVLDAA85T50G702B"],
          ["GxORalMAelfZ0edFJjjYUw", "given_name", "Ada"],
          ["_vV5RIkl0IOEXKots9kt1w", "family_name", "Lovelace"],
        ],
      },
      {
        id: "DrivingLicense",
        vct: "MDL",
        keyTag: mdlKeyTag,
        credential: mdlSdJwt,
        purposes: [{ required: true }],
        requiredDisclosures: [
          ["4d10ba615ed63a12", "document_number", "123456789"],
        ],
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with missing optional credentials", () => {
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

    const result = evaluateDcqlQuery(credentials, query);
    const expected = [
      {
        id: "PID",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pidSdJwt,
        purposes: [{ description: "Identification", required: true }],
        requiredDisclosures: [
          ["GxORalMAelfZ0edFJjjYUw", "given_name", "Ada"],
          ["_vV5RIkl0IOEXKots9kt1w", "family_name", "Lovelace"],
        ],
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with available optional credentials", () => {
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

    const result = evaluateDcqlQuery(credentials, query);
    const expected = [
      {
        id: "PID",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pidSdJwt,
        purposes: [{ description: "Identification", required: true }],
        requiredDisclosures: [
          ["GxORalMAelfZ0edFJjjYUw", "given_name", "Ada"],
          ["_vV5RIkl0IOEXKots9kt1w", "family_name", "Lovelace"],
        ],
      },
      {
        id: "MDL",
        vct: "MDL",
        keyTag: mdlKeyTag,
        credential: mdlSdJwt,
        purposes: [{ description: "Extra services", required: false }],
        requiredDisclosures: [
          ["4d10ba615ed63a12", "document_number", "123456789"],
        ],
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with a complex query", () => {
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

    const result = evaluateDcqlQuery(credentials, query);
    const expected = [
      {
        id: "PID",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pidSdJwt,
        purposes: [{ description: "Identification", required: true }],
        requiredDisclosures: [
          ["Gr3R3s290OkQUm-NFTu96A", "tax_id_code", "TINIT-LVLDAA85T50G702B"],
          ["GxORalMAelfZ0edFJjjYUw", "given_name", "Ada"],
          ["_vV5RIkl0IOEXKots9kt1w", "family_name", "Lovelace"],
        ],
      },
      {
        id: "MDL",
        vct: "MDL",
        keyTag: mdlKeyTag,
        credential: mdlSdJwt,
        purposes: [{ description: "Identification", required: true }],
        requiredDisclosures: [
          ["82fbeec6d578ff2e", "birth_date", "01-01-1990"],
          ["4d10ba615ed63a12", "document_number", "123456789"],
        ],
      },
    ];

    expect(result).toEqual(expected);
  });

  it("should work correctly with multiple matching credential_sets", () => {
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

    const result = evaluateDcqlQuery(credentials, query);
    const expected = [
      {
        id: "PID",
        vct: "PersonIdentificationData",
        keyTag: pidKeyTag,
        credential: pidSdJwt,
        purposes: [{ description: "Identification", required: true }],
        requiredDisclosures: [
          ["Gr3R3s290OkQUm-NFTu96A", "tax_id_code", "TINIT-LVLDAA85T50G702B"],
          ["GxORalMAelfZ0edFJjjYUw", "given_name", "Ada"],
          ["_vV5RIkl0IOEXKots9kt1w", "family_name", "Lovelace"],
        ],
      },
      {
        id: "MDL",
        vct: "MDL",
        keyTag: mdlKeyTag,
        credential: mdlSdJwt,
        purposes: [
          { description: "Identification", required: true },
          { description: "Extra services", required: false },
        ],
        requiredDisclosures: [
          ["4d10ba615ed63a12", "document_number", "123456789"],
          ["82fbeec6d578ff2e", "birth_date", "01-01-1990"],
          ["c4b40efadfcd3bdd", "driving_privileges", "B"],
        ],
      },
    ];

    expect(result).toEqual(expected);
  });
});
