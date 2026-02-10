import {
  intermediateEntityConfiguration,
  intermediateEntityStatement,
  leafEntityConfiguration,
  leafEntityStatement,
  signed,
  trustAnchorEntityConfiguration,
} from "../__mocks__/entity-statements";
import { buildTrustChain } from "../build-chain";
import { mapToTrustAnchorConfig } from "../mappers";
import { verifyTrustChain } from "../verify-chain";

// Dummy base URLs aligned with our non‑regulatory examples
const leafBaseUrl = "https://leaf.example";
const intermediateBaseUrl = "https://intermediate.example";
const taBaseUrl = "https://trustanchor.example";

// Dummy tokens that will be produced by signing the dummy objects
let mockSignedLeafECJwt: string;
let mockSignedLeafESJwt: string;
let mockSignedIntermediateECJwt: string;
let mockSignedIntermediateESJwt: string;
let mockSignedTrustAnchorECJwt: string;

const mockResponses: Record<
  string,
  string | string[] | (() => Promise<string>)
> = {
  [`${taBaseUrl}/list`]: [leafBaseUrl, intermediateBaseUrl],
  [`${leafBaseUrl}/.well-known/openid-federation`]: () =>
    Promise.resolve(mockSignedLeafECJwt),
  [`${intermediateBaseUrl}/.well-known/openid-federation`]: () =>
    Promise.resolve(mockSignedIntermediateECJwt),
  [`${taBaseUrl}/fetch?sub=${encodeURIComponent(intermediateBaseUrl)}`]: () =>
    Promise.resolve(mockSignedIntermediateESJwt),
  [`${intermediateBaseUrl}/fetch?sub=${encodeURIComponent(leafBaseUrl)}`]: () =>
    Promise.resolve(mockSignedLeafESJwt),
  [`${taBaseUrl}/.well-known/openid-federation`]: () =>
    Promise.resolve(mockSignedTrustAnchorECJwt),
};

export const customFetch: GlobalFetch["fetch"] = async (requestInfo, _) => {
  const url = typeof requestInfo === "string" ? requestInfo : requestInfo.url;

  const mockResponse = mockResponses[url];

  if (!mockResponse) {
    return Promise.reject(new Error(`Unexpected fetch to ${url}`));
  }

  if (Array.isArray(mockResponse)) {
    // Federation list (array response)
    return Promise.resolve({
      status: 200,
      json: () => Promise.resolve(mockResponse),
    } as Response);
  }

  // Entity Configuration / Entity Statement (string JWT response)
  const resolvedText =
    typeof mockResponse === "function"
      ? mockResponse()
      : await Promise.resolve(mockResponse);
  const text = await resolvedText;
  return {
    status: 200,
    text: () => Promise.resolve(text),
  } as Response;
};

const mappedTrustAnchorEntityConfiguration = mapToTrustAnchorConfig(
  trustAnchorEntityConfiguration
);

// Before all tests, create real signed JWTs using `signed()` helper
beforeAll(async () => {
  mockSignedLeafECJwt = await signed(leafEntityConfiguration);
  mockSignedLeafESJwt = await signed(leafEntityStatement);
  mockSignedIntermediateECJwt = await signed(intermediateEntityConfiguration);
  mockSignedIntermediateESJwt = await signed(intermediateEntityStatement);
  mockSignedTrustAnchorECJwt = await signed(trustAnchorEntityConfiguration);
});

describe("buildTrustChain", () => {
  it("builds a valid trust chain from leaf to trust anchor", async () => {
    const chain = await buildTrustChain(
      leafBaseUrl,
      mappedTrustAnchorEntityConfiguration,
      customFetch
    );

    expect(chain).toEqual([
      mockSignedLeafECJwt,
      mockSignedLeafESJwt,
      mockSignedIntermediateESJwt,
      mockSignedTrustAnchorECJwt,
    ]);
  });

  it("builds a valid trust chain from leaf to trust anchor and verifies it", async () => {
    // Build the chain of trust
    const chain = await buildTrustChain(
      leafBaseUrl,
      mappedTrustAnchorEntityConfiguration,
      customFetch
    );

    expect(chain).toEqual([
      mockSignedLeafECJwt,
      mockSignedLeafESJwt,
      mockSignedIntermediateESJwt,
      mockSignedTrustAnchorECJwt,
    ]);

    // Verify the chain of trust
    const result = await verifyTrustChain(
      mappedTrustAnchorEntityConfiguration,
      chain
    );

    expect(result).toEqual([
      leafEntityConfiguration,
      leafEntityStatement,
      intermediateEntityStatement,
      trustAnchorEntityConfiguration,
    ]);
  });
});
