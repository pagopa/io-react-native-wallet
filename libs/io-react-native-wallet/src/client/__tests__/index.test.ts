import type { EndpointParameters } from "../generated/wallet-provider";

import { interpolateUrl } from "..";

type TestCase = [string, EndpointParameters, string];

describe("interpolateUrl", () => {
  test.each([
    ["/url/without/params", {}, "/url/without/params"],
    ["/url/with/{id}/param", { path: { id: "A" } }, "/url/with/A/param"],
    [
      "/url/with/{id}/{code}/params",
      { path: { code: "B", id: "A" } },
      "/url/with/A/B/params",
    ],
  ] as TestCase[])(
    "it should interpolate %s with %o to %s",
    (url, params, expected) => {
      expect(interpolateUrl(url, params)).toEqual(expected);
    },
  );
});
