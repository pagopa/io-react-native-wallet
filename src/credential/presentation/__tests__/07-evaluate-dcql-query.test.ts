import type { DcqlQuery } from "dcql";
import { evaluateDcqlQuery } from "../07-evaluate-dcql-query";

const pidKeyTag = "pidkeytag";
const pidSdJwt =
  "eyJraWQiOiItRl82VWdhOG4zVmVnalkyVTdZVUhLMXpMb2FELU5QVGM2M1JNSVNuTGF3IiwidHlwIjoidmMrc2Qtand0IiwiYWxnIjoiRVMyNTYifQ.eyJfc2QiOlsiMHExRDVKbWF2NnBRYUVoX0pfRmN2X3VOTk1RSWdDeWhRT3hxbFk0bDNxVSIsIktDSi1BVk52ODhkLXhqNnNVSUFPSnhGbmJVaDNySFhES2tJSDFsRnFiUnMiLCJNOWxvOVl4RE5JWHJBcTJxV2VpQ0E0MHpwSl96WWZGZFJfNEFFQUxjUnRVIiwiY3pnalVrMG5xUkNzd1NoQ2hDamRTNkExLXY0N2RfcVRDU0ZJdklIaE1vSSIsIm5HblFyN2NsbTN0ZlRwOHlqTF91SHJEU090elIyUFZiOFM3R2VMZEFxQlEiLCJ4TklWd2xwU3NhWjhDSlNmMGd6NXhfNzVWUldXYzZWMW1scGVqZENycVVzIl0sInN1YiI6IjIxNmY4OTQ2LTllY2ItNDgxOS05MzA5LWMwNzZmMzRhN2UxMSIsIl9zZF9hbGciOiJzaGEtMjU2IiwidmN0IjoiUGVyc29uSWRlbnRpZmljYXRpb25EYXRhIiwiaXNzIjoiaHR0cHM6Ly9wcmUuZWlkLndhbGxldC5pcHpzLml0IiwiY25mIjp7Imp3ayI6eyJrdHkiOiJFQyIsImNydiI6IlAtMjU2Iiwia2lkIjoiUnYzVy1FaUtwdkJUeWs1eVp4dnJldi03TURCNlNselVDQm9fQ1FqamRkVSIsIngiOiIwV294N1F0eVBxQnlnMzVNSF9YeUNjbmQ1TGUtSm0wQVhIbFVnREJBMDNZIiwieSI6ImVFaFZ2ZzFKUHFOZDNEVFNhNG1HREdCbHdZNk5QLUVaYkxiTkZYU1h3SWcifX0sImV4cCI6MTc1MTU0NjU3Niwic3RhdHVzIjp7InN0YXR1c19hdHRlc3RhdGlvbiI6eyJjcmVkZW50aWFsX2hhc2hfYWxnIjoic2hhLTI1NiJ9fX0.qXHA2oqr8trX4fGxpxpUft2GX380TM3pzfo1MYAsDjUC8HsODA-4rdRWAvDe2zYP57x4tJU7eiABkd1Kmln9yQ~WyJrSkRFUDhFYU5URU1CRE9aelp6VDR3IiwidW5pcXVlX2lkIiwiVElOSVQtTFZMREFBODVUNTBHNzAyQiJd~WyJ6SUF5VUZ2UGZJcEUxekJxeEk1aGFRIiwiYmlydGhfZGF0ZSIsIjE5ODUtMTItMTAiXQ~WyJHcjNSM3MyOTBPa1FVbS1ORlR1OTZBIiwidGF4X2lkX2NvZGUiLCJUSU5JVC1MVkxEQUE4NVQ1MEc3MDJCIl0~WyJHeE9SYWxNQWVsZlowZWRGSmpqWVV3IiwiZ2l2ZW5fbmFtZSIsIkFkYSJd~WyJfdlY1UklrbDBJT0VYS290czlrdDF3IiwiZmFtaWx5X25hbWUiLCJMb3ZlbGFjZSJd~WyJDajV0Y2NSNzJKd3J6ZTJUVzRhLXdnIiwiaWF0IiwxNzIwMDEwNTc1XQ";
const mdlKeyTag = "mdlkeytag";
const mdlSdJwt =
  "eyJ0eXAiOiJ2YytzZC1qd3QiLCJhbGciOiJFUzI1NiIsImtpZCI6Ii1GXzZVZ2E4bjNWZWdqWTJVN1lVSEsxekxvYUQtTlBUYzYzUk1JU25MYXcifQ.ew0KICAic3ViIjogIjlhOWQ4ZjBmLWVmZTctNDkzZS05Y2ViLTM2MjZlNWJmZDc4MyIsDQogICJ2Y3QiOiAiTURMIiwNCiAgImlzcyI6ICJodHRwczovL2VhYS53YWxsZXQuaXB6cy5pdCIsDQogICJjbmYiOiB7DQogICAgImp3ayI6IHsNCiAgICAgICJrdHkiOiAiRUMiLA0KICAgICAgImNydiI6ICJQLTI1NiIsDQogICAgICAia2lkIjogImlUOXRhdTZUNG1ZcGRFeC0tSzVIVkRwbnJud2poU3JsNTdfdE03Skw4QjAiLA0KICAgICAgIngiOiAiaDI5dFdma0NKNzNuSmJQNTFDNFNvdGRJMEN1dHRmUVMzU3Z0MHNlNmdGVSIsDQogICAgICAieSI6ICJtQmF2bGJpSkxGaEdzdUlKUno3d1lMaVcxNWdwaVdFRExqRTFnZlZoXzdrIg0KICAgIH0NCiAgfSwNCiAgImV4cCI6IDE3OTg3NTgwMDAsDQogICJzdGF0dXMiOiB7DQogICAgInN0YXR1c19hdHRlc3RhdGlvbiI6IHsNCiAgICAgICJjcmVkZW50aWFsX2hhc2hfYWxnIjogInNoYS0yNTYiDQogICAgfQ0KICB9LA0KICAiX3NkIjogWw0KICAgICIwWjJ2dEloV1d1TjhrNXZWa3I4eVBjbWREeDYtRkU2M0o2V29IYVJFOG8wIiwNCiAgICAiTGZST3hiVGtZRDNucXJNdDl4cXFIeG9lNjI5MHh6RS1nMm4xVk85MWF4SSIsDQogICAgIlFBVmJ6T25CX2FtSnFDdmJZWFNDRGFIU2NJRFZmak9yMDhpakdyQUpmMUEiLA0KICAgICJWc2YwSTE1dmlFenhWVlFNNDBpVFRId2pBYkxZb2p0WTR5UGh3RGM4LTdNIiwNCiAgICAiWlh5eWEwMDFxblFSek5YT2MyUVF4RV80THBGSTNSV1VXN1hzVW1SYjlTcyIsDQogICAgImFCaW1MYVJYOW1uWkRJbzFUMC1DRDVELWN5ZVZUZWhhclBHcEJvRGJTdjAiDQogIF0sDQogICJfc2RfYWxnIjogInNoYS0yNTYiDQp9.Ci9J8A_yKtISUA7VufKRcKaGF0K7-Pv6Dev2tkIw64C6kbxN3A68_jKkFZfa651zTpeBm6ovpHOouBPg92pkdg~WyJmZjAwNmU0MTExYzA4NmMyIiwiZmFtaWx5X25hbWUiLCJSb3NzaSJd~WyI4MDY5MjI3MjZlM2VhY2VkIiwiZ2l2ZW5fbmFtZSIsIk1hcmlvIl0~WyI4MmZiZWVjNmQ1NzhmZjJlIiwiYmlydGhfZGF0ZSIsIjAxLTAxLTE5OTAiXQ~WyI0ZDEwYmE2MTVlZDYzYTEyIiwiZG9jdW1lbnRfbnVtYmVyIiwiMTIzNDU2Nzg5Il0~WyJjNGI0MGVmYWRmY2QzYmRkIiwiZHJpdmluZ19wcml2aWxlZ2VzIiwiQiJd~WyJiZTdmZjg4M2I4ZDJiYzE1IiwicGxhY2Vfb2ZfYmlydGgiLCJSb21hIl0~";

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
          format: "vc+sd-jwt",
          // @ts-expect-error invalid query on purpose
          claims: [{ id: "tax_id_code", path: "tax_id_code" }],
        },
      ],
    };

    expect(() => evaluateDcqlQuery(credentials, query)).toThrowError();
  });

  it("should throw error when the DCQL is invalid", () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PersonIdentificationData",
          format: "vc+sd-jwt",
          claims: [{ id: "tax_id_code", path: ["tax_id_code"] }],
          claim_sets: [["missing_claim", "tax_id_code"]],
        },
      ],
    };

    expect(() => evaluateDcqlQuery(credentials, query)).toThrowError();
  });

  it("should work correctly with a simple query", () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PID",
          format: "vc+sd-jwt",
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
        keyTag: pidKeyTag,
        credential: pidSdJwt,
        isOptional: false,
        requiredDisclosures: [
          ["Gr3R3s290OkQUm-NFTu96A", "tax_id_code", "TINIT-LVLDAA85T50G702B"],
          ["GxORalMAelfZ0edFJjjYUw", "given_name", "Ada"],
          ["_vV5RIkl0IOEXKots9kt1w", "family_name", "Lovelace"],
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
          format: "vc+sd-jwt",
          meta: {
            vct_values: ["PersonIdentificationData"],
          },
          claims: [{ path: ["given_name"] }, { path: ["family_name"] }],
        },
        {
          id: "optional",
          format: "vc+sd-jwt",
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
        keyTag: pidKeyTag,
        credential: pidSdJwt,
        isOptional: false,
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
          format: "vc+sd-jwt",
          meta: {
            vct_values: ["PersonIdentificationData"],
          },
          claims: [{ path: ["given_name"] }, { path: ["family_name"] }],
        },
        {
          id: "MDL",
          format: "vc+sd-jwt",
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
        keyTag: pidKeyTag,
        credential: pidSdJwt,
        isOptional: false,
        requiredDisclosures: [
          ["GxORalMAelfZ0edFJjjYUw", "given_name", "Ada"],
          ["_vV5RIkl0IOEXKots9kt1w", "family_name", "Lovelace"],
        ],
      },
      {
        id: "MDL",
        keyTag: mdlKeyTag,
        credential: mdlSdJwt,
        isOptional: true,
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
          format: "vc+sd-jwt",
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
          format: "vc+sd-jwt",
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
          format: "vc+sd-jwt",
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
        keyTag: pidKeyTag,
        credential: pidSdJwt,
        isOptional: false,
        requiredDisclosures: [
          ["Gr3R3s290OkQUm-NFTu96A", "tax_id_code", "TINIT-LVLDAA85T50G702B"],
          ["GxORalMAelfZ0edFJjjYUw", "given_name", "Ada"],
          ["_vV5RIkl0IOEXKots9kt1w", "family_name", "Lovelace"],
        ],
      },
      {
        id: "MDL",
        keyTag: mdlKeyTag,
        credential: mdlSdJwt,
        isOptional: false,
        requiredDisclosures: [
          ["82fbeec6d578ff2e", "birth_date", "01-01-1990"],
          ["4d10ba615ed63a12", "document_number", "123456789"],
        ],
      },
    ];

    expect(result).toEqual(expected);
  });
});
