import { decode } from "..";
import { disclose } from "../../../sd-jwt";
import { pid } from "../../../sd-jwt/__mocks__/sd-jwt";

describe("decode", () => {
  it("should return pid, sd-jwt and disclosures", async () => {
    const result = decode(pid.token);

    // check shallow shape
    expect(result).toEqual(
      expect.objectContaining({
        pid: expect.any(Object),
        sdJwt: expect.any(Object),
        disclosures: expect.any(Array),
      })
    );
    // check pid in deep
    expect(result.pid).toEqual({
      issuer: "https://pre.eid.wallet.ipzs.it",
      expiration: new Date(1751546576000),
      issuedAt: new Date(1720010575000),
      claims: {
        uniqueId: "TINIT-LVLDAA85T50G702B",
        givenName: "Ada",
        familyName: "Lovelace",
        birthDate: "1985-12-10",
        taxIdCode: "TINIT-LVLDAA85T50G702B",
      },
    });
  });

  it("should return a valid pid", async () => {
    const result = decode(pid.token);

    expect(result.pid).toEqual({
      issuer: "https://pre.eid.wallet.ipzs.it",
      issuedAt: new Date(1720010575000),
      expiration: new Date(1751546576000),
      claims: {
        uniqueId: "TINIT-LVLDAA85T50G702B",
        givenName: "Ada",
        familyName: "Lovelace",
        birthDate: "1985-12-10",
        taxIdCode: "TINIT-LVLDAA85T50G702B",
      },
    });
  });
});

describe("disclose", () => {
  it("should return pid, sd-jwt and disclosures", async () => {
    const result = await disclose(pid.token, [
      "unique_id",
      "given_name",
      "family_name",
      "birth_date",
      "tax_id_code",
      "iat",
    ]);

    const expected = {
      token: pid.token,
      paths: [
        { claim: "unique_id", path: "verified_claims.claims._sd[1]" },
        { claim: "given_name", path: "verified_claims.claims._sd[3]" },
        { claim: "family_name", path: "verified_claims.claims._sd[0]" },
        { claim: "birth_date", path: "verified_claims.claims._sd[5]" },
        { claim: "tax_id_code", path: "verified_claims.claims._sd[2]" },
        { claim: "iat", path: "verified_claims.claims._sd[4]" },
      ],
    };

    expect(result).toEqual(expected);
  });
});
