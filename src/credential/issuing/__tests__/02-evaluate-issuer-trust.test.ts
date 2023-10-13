import { evaluateIssuerTrust } from "../02-evaluate-issuer-trust";

describe("evaluateIssuerTrust", () => {
  it("should work", async () => {
    const result = await evaluateIssuerTrust({})(
      "https://api.eudi-wallet-it-issuer.it/rp"
    );
    expect(result.issuerConf).toBeDefined();
  });
});
