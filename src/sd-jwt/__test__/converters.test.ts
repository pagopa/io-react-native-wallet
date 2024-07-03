import { getValueFromDisclosures } from "../converters";
import { Disclosure } from "../types";

const disclosures: Disclosure[] = [
  ["6w1_soRXFgaHKfpYn3cvfQ", "given_name", "Mario"],
  ["fuNp97Hf3wV6y48y-QZhIg", "birth_date", "1980-10-01"],
  [
    "p-9LzyWHZBVDvhXDWkN2xA",
    "place_of_birth",
    { country: "IT", locality: "Rome" },
  ],
];

describe("getValueFromDisclosures", () => {
  it("should return correct value for given_name", () => {
    const success = getValueFromDisclosures(disclosures, "given_name");
    expect(success).toBe("Mario");
  });
  it("should return correct value for place_of_birth", () => {
    const success = getValueFromDisclosures(disclosures, "place_of_birth");
    expect(success).toEqual({ country: "IT", locality: "Rome" });
  });
  it("should fail", () => {
    const success = getValueFromDisclosures(disclosures, "given_surname");
    expect(success).toBeUndefined();
  });
});
