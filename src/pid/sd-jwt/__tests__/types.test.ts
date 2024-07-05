import { PID } from "../types";

describe("PID", () => {
  it("should accept a valid PID", () => {
    // example based on data provided at https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html
    const value = {
      issuer: "https://pidprovider.example.org",
      issuedAt: new Date(1541493724000),
      expiration: new Date(1541493724000),
      claims: {
        uniqueId: "idANPR",
        givenName: "Mario",
        familyName: "Rossi",
        birthDate: "1980-10-01",
        placeOfBirth: { country: "IT", locality: "Rome" },
        taxIdCode: "TINIT-RSSMRA80A10H501A",
      },
    };
    const { success } = PID.safeParse(value);
    expect(success).toBe(true);
  });
});
