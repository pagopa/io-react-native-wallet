import { groupBy, keyBy } from "../object";

const sampleArray = [
  { color: "red", id: "1" },
  { color: "blue", id: "2" },
  { color: "red", id: "3" },
  { color: "orange", id: "4" },
  { color: "green", id: "5" },
];

describe("keyBy", () => {
  it("correctly transforms the input array", () => {
    expect(keyBy(sampleArray, "id")).toEqual(
      new Map([
        ["1", { color: "red", id: "1" }],
        ["2", { color: "blue", id: "2" }],
        ["3", { color: "red", id: "3" }],
        ["4", { color: "orange", id: "4" }],
        ["5", { color: "green", id: "5" }],
      ]),
    );
  });
});

describe("groupBy", () => {
  it("correctly transforms the input array", () => {
    expect(groupBy(sampleArray, "color")).toEqual(
      new Map([
        ["blue", [{ color: "blue", id: "2" }]],
        ["green", [{ color: "green", id: "5" }]],
        ["orange", [{ color: "orange", id: "4" }]],
        [
          "red",
          [
            { color: "red", id: "1" },
            { color: "red", id: "3" },
          ],
        ],
      ]),
    );
  });
});
