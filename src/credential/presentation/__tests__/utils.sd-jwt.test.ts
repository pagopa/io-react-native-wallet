import { pathToPresentationFrame } from "../utils.sd-jwt";

describe("pathToPresentationFrame", () => {
  test.each([
    [["name"], { name: "Mario" }, { name: true }],
    [
      ["address", "country"],
      { address: { country: "Italy", city: "Roma" } },
      { address: { country: true } },
    ],
    [
      ["nested", "claim", "value"],
      { nested: { claim: { value: "something" } } },
      { nested: { claim: { value: true } } },
    ],
    [
      ["list", null],
      { list: ["a", "b", "c"] },
      { list: { 0: true, 1: true, 2: true } },
    ],
    [["list", 1], { list: ["a", "b", "c"] }, { list: { 1: true } }],
    [
      ["list", 0, "name"],
      {
        list: [
          { name: "A", surname: "B" },
          { name: "C", surname: "D" },
        ],
      },
      { list: { 0: { name: true } } },
    ],
    [
      ["list", null, "name"],
      {
        list: [
          { name: "A", surname: "B" },
          { name: "C", surname: "D" },
        ],
      },
      { list: { 0: { name: true }, 1: { name: true } } },
    ],
  ])("should handle path: %s", (path, claim, expected) => {
    expect(pathToPresentationFrame(path, claim)).toEqual(expected);
  });
});
