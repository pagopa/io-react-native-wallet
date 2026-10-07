import { HashAlgorithm } from "@pagopa/io-wallet-oauth2";

import { partialCallbacks } from "../callbacks";

describe("partialCallbacks.hash", () => {
  it.each([
    {
      algorithm: HashAlgorithm.Sha256,
      expected:
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    },
    {
      algorithm: HashAlgorithm.Sha384,
      expected:
        "cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7",
    },
    {
      algorithm: HashAlgorithm.Sha512,
      expected:
        "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f",
    },
  ])(
    "hashes only the provided byte view with $algorithm",
    async ({ algorithm, expected }) => {
      const bytes = new Uint8Array([0, 0, 0x61, 0x62, 0x63, 0]);
      const hash = await partialCallbacks.hash(bytes.subarray(2, 5), algorithm);

      expect(Buffer.from(hash).toString("hex")).toBe(expected);
    },
  );
});
