import { groupBy, keyBy } from "../object";

const sampleArray = [
  { id: "1", color: "red" },
  { id: "2", color: "blue" },
  { id: "3", color: "red" },
  { id: "4", color: "orange" },
  { id: "5", color: "green" },
];

describe("keyBy", () => {
  it("correctly transforms the input array", () => {
    expect(keyBy(sampleArray, "id")).toEqual({
      "1": { id: "1", color: "red" },
      "2": { id: "2", color: "blue" },
      "3": { id: "3", color: "red" },
      "4": { id: "4", color: "orange" },
      "5": { id: "5", color: "green" },
    });
  });
});

describe("groupBy", () => {
  it("correctly transforms the input array", () => {
    expect(groupBy(sampleArray, "color")).toEqual({
      red: [
        { id: "1", color: "red" },
        { id: "3", color: "red" },
      ],
      blue: [{ id: "2", color: "blue" }],
      orange: [{ id: "4", color: "orange" }],
      green: [{ id: "5", color: "green" }],
    });
  });
});
