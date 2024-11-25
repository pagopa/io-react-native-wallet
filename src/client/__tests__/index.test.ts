import { interpolateUrl } from "..";
import type { EndpointParameters } from "../generated/wallet-provider";

type TestCase = [string, EndpointParameters, string];

describe("interpolateUrl", () => {
  test.each([
    ["/url/without/params", {}, "/url/without/params"],
    ["/url/with/{id}/param", { path: { id: "A" } }, "/url/with/A/param"],
    [
      "/url/with/{id}/{code}/params",
      { path: { id: "A", code: "B" } },
      "/url/with/A/B/params",
    ],
  ] as Array<TestCase>)(
    "it should interpolate %s with %o to %s",
    (url, params, expected) => {
      expect(interpolateUrl(url, params)).toEqual(expected);
    }
  );
});
