// __tests__/evaluateInputDescriptorForSdJwt4VC.test.ts

import {
  disclosureWithEncodedToEvaluatedDisclosure,
  evaluateInputDescriptorForMdoc,
  evaluateInputDescriptorForSdJwt4VC,
} from "../07-evaluate-input-descriptor";
import { InputDescriptor, type EvaluatedDisclosure } from "../types";
import {
  type SdJwt4VC,
  type DisclosureWithEncoded,
} from "../../../sd-jwt/types";
import { CBOR } from "@pagopa/io-react-native-cbor";

describe("evaluateInputDescriptorForSdJwt4VC", () => {
  it("should return all disclosures if constraints.fields is not present", () => {
    const inputDescriptor: InputDescriptor = {
      // constraints is undefined or empty
      id: "testDescriptor",
      name: "test",
    } as unknown as InputDescriptor;

    const payloadCredential: SdJwt4VC["payload"] = {
      // minimal payload
      sub: "1234567890",
      iss: "issuer",
      iat: 1609459200,
    } as unknown as SdJwt4VC["payload"];

    const disclosures: DisclosureWithEncoded[] = [
      {
        decoded: ["1", "given_name", "John"],
        encoded: "encoded1",
      },
      {
        decoded: ["1", "family_name", "Doe"],
        encoded: "encoded2",
      },
    ];

    const { requiredDisclosures, optionalDisclosures } =
      evaluateInputDescriptorForSdJwt4VC(
        inputDescriptor,
        payloadCredential,
        disclosures
      );
    expect(requiredDisclosures).toEqual([]);
    expect(optionalDisclosures).toEqual([]);
  });

  it("should throw an error if a required field path does not exist", () => {
    const inputDescriptor: InputDescriptor = {
      id: "testDescriptor",
      name: "test",
      constraints: {
        fields: [
          {
            path: ["$.missing_name"],
            optional: false, // Not optional
          },
        ],
      },
    };

    const payloadCredential: SdJwt4VC["payload"] = {
      sub: "1234567890",
      iss: "issuer",
      iat: 1609459200,
    } as unknown as SdJwt4VC["payload"];

    const disclosures: DisclosureWithEncoded[] = [
      {
        decoded: ["1", "given_name", "John"],
        encoded: "encoded1",
      },
    ];

    expect(() =>
      evaluateInputDescriptorForSdJwt4VC(
        inputDescriptor,
        payloadCredential,
        disclosures
      )
    ).toThrow(); // Required field not satisfied
  });

  it("should throw if a field path does not exist but is optional", () => {
    const inputDescriptor: InputDescriptor = {
      id: "testDescriptor",
      name: "test",
      constraints: {
        fields: [
          {
            path: ["$.nonexistent_field"],
            optional: true,
          },
        ],
      },
    };

    const payloadCredential: SdJwt4VC["payload"] = {
      sub: "1234567890",
      iss: "issuer",
      iat: 1609459200,
    } as unknown as SdJwt4VC["payload"];

    const disclosures: DisclosureWithEncoded[] = [
      {
        decoded: ["1", "given_name", "John"],
        encoded: "encoded1",
      },
    ];

    expect(() => {
      evaluateInputDescriptorForSdJwt4VC(
        inputDescriptor,
        payloadCredential,
        disclosures
      );
    }).toThrow();
  });

  it("should pass if a field path required and another is optional", () => {
    const inputDescriptor: InputDescriptor = {
      id: "testDescriptor",
      name: "test",
      constraints: {
        fields: [
          {
            path: ["$.given_name"],
            optional: true,
          },
          {
            path: ["$.family_name"],
          },
        ],
      },
    };

    const payloadCredential: SdJwt4VC["payload"] = {
      sub: "1234567890",
      iss: "issuer",
      iat: 1609459200,
    } as unknown as SdJwt4VC["payload"];

    const disclosures: DisclosureWithEncoded[] = [
      {
        decoded: ["1", "given_name", "John"],
        encoded: "encoded1",
      },
      {
        decoded: ["2", "family_name", "Smith"],
        encoded: "encoded2",
      },
    ];

    const { requiredDisclosures, optionalDisclosures } =
      evaluateInputDescriptorForSdJwt4VC(
        inputDescriptor,
        payloadCredential,
        disclosures
      );
    // Because the field is optional, we keep the original disclosures
    expect(requiredDisclosures).toEqual(
      disclosures[1]
        ? [disclosureWithEncodedToEvaluatedDisclosure(disclosures[1])]
        : []
    );
    expect(optionalDisclosures).toEqual(
      disclosures[0]
        ? [disclosureWithEncodedToEvaluatedDisclosure(disclosures[0])]
        : []
    );
  });

  it("should throw an error if filter (JSON Schema) validation fails", () => {
    const inputDescriptor: InputDescriptor = {
      id: "testDescriptor",
      name: "test",
      constraints: {
        fields: [
          {
            path: ["$.age"],
            optional: false,
            // JSON Schema requiring a minimum age of 21
            filter: {
              type: "number",
              minimum: 21,
            },
          },
        ],
      },
    };

    const payloadCredential: SdJwt4VC["payload"] = {
      sub: "1234567890",
      iss: "issuer",
      iat: 1609459200,
    } as unknown as SdJwt4VC["payload"];

    const disclosures: DisclosureWithEncoded[] = [
      {
        decoded: ["1", "age", 20],
        encoded: "encoded1",
      },
    ];

    expect(() =>
      evaluateInputDescriptorForSdJwt4VC(
        inputDescriptor,
        payloadCredential,
        disclosures
      )
    ).toThrow(); // Fails JSON schema validation
  });

  it("should keep disclosures if filter (JSON Schema) validation succeeds", async () => {
    const inputDescriptor: InputDescriptor = {
      id: "testDescriptor",
      name: "test",
      constraints: {
        fields: [
          {
            path: ["$.age"],
            optional: false,
            // JSON Schema requiring a minimum age of 21
            filter: {
              type: "number",
              minimum: 21,
            },
          },
        ],
      },
    };

    const payloadCredential: SdJwt4VC["payload"] = {
      sub: "1234567890",
      iss: "issuer",
      iat: 1609459200,
    } as unknown as SdJwt4VC["payload"];

    const disclosures: DisclosureWithEncoded[] = [
      {
        decoded: ["1", "age", 25],
        encoded: "encoded1",
      },
    ];

    const { requiredDisclosures } = evaluateInputDescriptorForSdJwt4VC(
      inputDescriptor,
      payloadCredential,
      disclosures
    );

    expect(requiredDisclosures).toStrictEqual(
      disclosures.map(disclosureWithEncodedToEvaluatedDisclosure)
    );
  });
});

describe("evaluateInputDescriptorForMdoc", () => {
  const minimalIssuerAuth = {
    rawValue: "mocked-issuerAuth",
    unprotectedHeader: [
      {
        keyId: "mocked-keyId",
        algorithm: "mocked-alg",
      },
    ],
    payload: {
      validityInfo: {
        signed: new Date("2025-04-03T17:08:59Z"),
        validFrom: new Date("2025-04-03T17:08:59Z"),
        validUntil: new Date("2026-04-03T17:08:59Z"),
      },
      deviceKeyInfo: {
        deviceKey: {
          kty: "EC" as const,
          crv: "P-256" as const,
          x: "mocked-x",
          y: "mocked-y",
        },
      },
      valueDigests: {
        "org.iso.18013.5.1": {
          1: "Doe",
          2: "John",
          3: 20,
        },
      },
    },
  };

  const minimalPayloadCredential: CBOR.IssuerSigned = {
    // minimal payload
    issuerAuth: minimalIssuerAuth,
    nameSpaces: {
      "org.iso.18013.5.1": [
        {
          elementIdentifier: "given_name",
          elementValue: "John",
        },
        {
          elementIdentifier: "age",
          elementValue: 20,
        },
      ],
    },
  };

  it("should return all disclosures if constraints.fields is not present", () => {
    const inputDescriptor: InputDescriptor = {
      // constraints is undefined or empty
      id: "testDescriptor",
      name: "test",
    } as unknown as InputDescriptor;

    const { requiredDisclosures, optionalDisclosures } =
      evaluateInputDescriptorForMdoc(inputDescriptor, minimalPayloadCredential);
    expect(requiredDisclosures).toEqual([]);
    expect(optionalDisclosures).toEqual([]);
  });

  it("should throw an error if a required field path does not exist", () => {
    const inputDescriptor: InputDescriptor = {
      id: "testDescriptor",
      name: "test",
      constraints: {
        fields: [
          {
            path: ["$['org.iso.18013.5.1']['missing_name']"],
            optional: false, // Not optional
          },
        ],
      },
    };

    expect(() =>
      evaluateInputDescriptorForMdoc(inputDescriptor, minimalPayloadCredential)
    ).toThrow(); // Required field not satisfied
  });

  it("should throw if a field path does not exist but is optional", () => {
    const inputDescriptor: InputDescriptor = {
      id: "testDescriptor",
      name: "test",
      constraints: {
        fields: [
          {
            path: ["$['org.iso.18013.5.1']['nonexistent_field']"],
            optional: true,
          },
        ],
      },
    };

    expect(() =>
      evaluateInputDescriptorForMdoc(inputDescriptor, minimalPayloadCredential)
    ).toThrow();
  });

  it("should pass if a field path required and another is optional", () => {
    const inputDescriptor: InputDescriptor = {
      id: "testDescriptor",
      name: "test",
      constraints: {
        fields: [
          {
            path: ["$['org.iso.18013.5.1']['family_name']"],
            optional: true,
          },
          {
            path: ["$['org.iso.18013.5.1']['given_name']"],
          },
        ],
      },
    };

    const payloadCredential: CBOR.IssuerSigned = {
      // minimal payload
      issuerAuth: minimalIssuerAuth,
      nameSpaces: {
        "org.iso.18013.5.1": [
          {
            elementIdentifier: "given_name",
            elementValue: "John",
          },
          {
            elementIdentifier: "family_name",
            elementValue: "Dan",
          },
        ],
      },
    };

    const requiredDisclosuresExpected: EvaluatedDisclosure[] = [
      { namespace: "org.iso.18013.5.1", name: "given_name", value: "John" },
    ];

    const optionalDisclosuresExpected: EvaluatedDisclosure[] = [
      { namespace: "org.iso.18013.5.1", name: "family_name", value: "Dan" },
    ];

    const { requiredDisclosures, optionalDisclosures } =
      evaluateInputDescriptorForMdoc(inputDescriptor, payloadCredential);
    // Because the field is optional, we keep the original disclosures
    expect(requiredDisclosures).toEqual(requiredDisclosuresExpected);
    expect(optionalDisclosures).toEqual(optionalDisclosuresExpected);
  });

  it("should throw an error if filter (JSON Schema) validation fails", () => {
    const inputDescriptor: InputDescriptor = {
      id: "testDescriptor",
      name: "test",
      constraints: {
        fields: [
          {
            path: ["$['org.iso.18013.5.1']['age']"],
            optional: false,
            // JSON Schema requiring a minimum age of 21
            filter: {
              type: "number",
              minimum: 21,
            },
          },
        ],
      },
    };

    expect(() =>
      evaluateInputDescriptorForMdoc(inputDescriptor, minimalPayloadCredential)
    ).toThrow(); // Fails JSON schema validation
  });

  it("should keep disclosures if filter (JSON Schema) validation succeeds", async () => {
    const inputDescriptor: InputDescriptor = {
      id: "testDescriptor",
      name: "test",
      constraints: {
        fields: [
          {
            path: ["$['org.iso.18013.5.1']['age']"],
            filter: {
              type: "number",
              minimum: 19,
            },
          },
        ],
      },
    };

    const requiredDisclosuresExpected: EvaluatedDisclosure[] = [
      { namespace: "org.iso.18013.5.1", name: "age", value: 20 },
    ];
    const { requiredDisclosures } = evaluateInputDescriptorForMdoc(
      inputDescriptor,
      minimalPayloadCredential
    );

    expect(requiredDisclosures).toStrictEqual(requiredDisclosuresExpected);
  });
});
