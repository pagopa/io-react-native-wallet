import { Offer } from "../index";

describe("Offer v1.0.0", () => {
  it("should not be supported", () => {
    expect(Offer.isSupported).toBe(false);
  });
});
