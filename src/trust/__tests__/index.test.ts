import { verifyTrustChain } from "..";
import {
  intermediateEntityStatement,
  leafEntityConfiguration,
  leafEntityStatement,
  signed,
  trustAnchorEntityConfiguration,
} from "../__mocks__/entity-statements";

describe("verifyTrustChain", () => {
  it("should throw on empty trust chain", async () => {
    await expect(
      verifyTrustChain(trustAnchorEntityConfiguration, [])
    ).rejects.toThrow();
  });

  it("should resolve a correct chain", async () => {
    const result = await verifyTrustChain(trustAnchorEntityConfiguration, [
      await signed(leafEntityConfiguration),
      await signed(leafEntityStatement),
      await signed(intermediateEntityStatement),
    ]);
    expect(result).toEqual([
      leafEntityConfiguration,
      leafEntityStatement,
      intermediateEntityStatement,
    ]);
  });

  it("should accept the trust anchor entity configuration as last element of the chain", async () => {
    const result = await verifyTrustChain(trustAnchorEntityConfiguration, [
      await signed(leafEntityConfiguration),
      await signed(leafEntityStatement),
      await signed(intermediateEntityStatement),
      await signed(trustAnchorEntityConfiguration),
    ]);
    expect(result).toEqual([
      leafEntityConfiguration,
      leafEntityStatement,
      intermediateEntityStatement,
      trustAnchorEntityConfiguration,
    ]);
  });

  it("should throw on invalid trust chain", async () => {
    await expect(
      verifyTrustChain(trustAnchorEntityConfiguration, [
        await signed(leafEntityConfiguration),
        await signed(leafEntityStatement),
        // missing required intermediate entity
      ])
    ).rejects.toThrow();
  });

  it("should throw on emprty elements in trust chain", async () => {
    await expect(
      verifyTrustChain(trustAnchorEntityConfiguration, [
        await signed(leafEntityConfiguration),
        await signed(leafEntityStatement),
        "",
      ])
    ).rejects.toThrow();
  });

  it("should throw on invalid trust chain (unresolved trust)", async () => {
    const anotherTrustAnchor = {
      header: {
        typ: "entity-statement+jwt" as const,
        alg: "RS256",
        kid: "3vUQZOK8dViFClsFGd65Uc8gFWOLv74ylv0oU2tHIyQ",
      },
      payload: {
        iss: "https://another.trustanchor.example",
        sub: "https://another.trustanchor.example",
        jwks: {
          keys: [
            {
              kty: "RSA" as const,
              e: "AQAB",
              use: "sig",
              kid: "3vUQZOK8dViFClsFGd65Uc8gFWOLv74ylv0oU2tHIyQ",
              alg: "RS256",
              n: "6OtnC5VpTq_pYnQf--C2H1Je8s4QDymGZ4PIixt5R19WROkHksQExLYlSXU-NI7KvgjZvkSsoXVGslk9uZ_bY3kXCDe4Hb2zRMazwznCbjNbgz2kWrd32mj5s2KnLC9iUIuVuK6EPgMUSbVufUp3wYrNAbsAT2TUt5ZIkE9awVYaAR2nUVyIGucVag6kKu-Nd7mbMxeKFLO9glvaFWHBk6B1YtSXvY5d_bUxgLbu-cU9Zl5P4y0aiUw84bX0HraRl7R6WodIRnW7nzV4AOwU4GI2J3QUEodOMS-ZZQeCZSNs6lzBN2rMk0divgi2E4gIh0trwNciqSPcOc_qYbsubQ",
            },
          ],
        },
        metadata: {},
        authority_hints: [],
        iat: Date.now(),
        exp: 1849623968, // 11/2/2028
      },
    };
    await expect(
      verifyTrustChain(anotherTrustAnchor, [
        await signed(leafEntityConfiguration),
        await signed(leafEntityStatement),
        await signed(intermediateEntityStatement),
      ])
    ).rejects.toThrow();
  });
});
