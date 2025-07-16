import { DcqlError, type DcqlQuery } from "dcql";
import { evaluateDcqlQuery } from "../07-evaluate-dcql-query";
import { CredentialsNotFoundError, type NotFoundDetail } from "../errors";
import { pid, mdl, legacyPid } from "../../../sd-jwt/__mocks__/sd-jwt";
import { createCryptoContextFor } from "../../../utils/crypto";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";

const pidKeyTag = "pidkeytag";
const mdlKeyTag = "mdlkeytag";

const pidCryptoContext = createCryptoContextFor(pidKeyTag);
const mdlCryptoContext = createCryptoContextFor(mdlKeyTag);

const credentials = [
  [pidCryptoContext, pid.token],
  [mdlCryptoContext, mdl.token],
] as [CryptoContext, string][];

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
        cryptoContext: pidCryptoContext,
        credential: pid.token,
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
        cryptoContext: pidCryptoContext,
        credential: pid.token,
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
        cryptoContext: mdlCryptoContext,
        credential: mdl.token,
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
        cryptoContext: pidCryptoContext,
        credential: pid.token,
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
        cryptoContext: pidCryptoContext,
        credential: pid.token,
        purposes: [{ description: "Identification", required: true }],
        requiredDisclosures: [
          ["GxORalMAelfZ0edFJjjYUw", "given_name", "Ada"],
          ["_vV5RIkl0IOEXKots9kt1w", "family_name", "Lovelace"],
        ],
      },
      {
        id: "MDL",
        vct: "MDL",
        cryptoContext: mdlCryptoContext,
        credential: mdl.token,
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
        cryptoContext: pidCryptoContext,
        credential: pid.token,
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
        cryptoContext: mdlCryptoContext,
        credential: mdl.token,
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
        cryptoContext: pidCryptoContext,
        credential: pid.token,
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
        cryptoContext: mdlCryptoContext,
        credential: mdl.token,
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

  it("should work with older vc+sd-jwt credentials", () => {
    const query: DcqlQuery.Input = {
      credentials: [
        {
          id: "PID",
          format: "vc+sd-jwt",
          meta: {
            vct_values: ["PersonIdentificationData"],
          },
          claims: [{ path: ["tax_id_code"] }],
        },
      ],
    };
    const result = evaluateDcqlQuery([[pidCryptoContext, legacyPid]], query);
    const expected = [
      {
        id: "PID",
        vct: "PersonIdentificationData",
        cryptoContext: pidCryptoContext,
        credential: legacyPid,
        purposes: [{ required: true }],
        requiredDisclosures: [
          ["Gr3R3s290OkQUm-NFTu96A", "tax_id_code", "TINIT-LVLDAA85T50G702B"],
        ],
      },
    ];

    expect(result).toEqual(expected);
  });
});
