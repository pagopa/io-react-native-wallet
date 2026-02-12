import type { CredentialOffer } from "@pagopa/io-wallet-oid4vci";
import { UnimplementedFeatureError } from "../../../../utils/errors";
import { Offer } from "../index";

describe("Offer v1.0.0", () => {
  it("resolveCredentialOffer should throw UnimplementedFeatureError", async () => {
    await expect(Offer.resolveCredentialOffer("some-uri")).rejects.toThrow(
      UnimplementedFeatureError
    );
  });

  it("extractGrantDetails should throw UnimplementedFeatureError", () => {
    const offer: CredentialOffer = {
      credential_issuer: "https://issuer.example.com",
      credential_configuration_ids: ["test"],
      grants: {
        authorization_code: {
          scope: "test-scope",
        },
      },
    };

    expect(() => Offer.extractGrantDetails(offer)).toThrow(
      UnimplementedFeatureError
    );
  });
});
