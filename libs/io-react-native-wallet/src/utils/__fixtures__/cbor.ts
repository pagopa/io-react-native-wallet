import type { CborDecoder, CborVerifier } from "../../mdoc/types";

/**
 * A {@link CborDecoder} whose methods resolve to empty objects, without relying on any native module.
 */
export const createMockCborDecoder = (): jest.Mocked<CborDecoder> => ({
  decode: jest.fn(async (_data: string) => ({})),
  decodeIssuerSigned: jest.fn(async (_data: string) => ({}) as never),
});

/**
 * A {@link CborVerifier} that always succeeds, without relying on any native module.
 */
export const createMockCborVerifier = (): jest.MockedFunction<CborVerifier> =>
  jest.fn<ReturnType<CborVerifier>, Parameters<CborVerifier>>(async () => true);
