import type { StatusList } from "../../api/types";
import { getStatus } from "../03-get-status";

describe("getStatus", () => {
  /*
    [0] VALID             0x00
    [1] INVALID           0x01
    [2] VALID             0x00
    [3] SUSPENDED         0x02
    [4] VALID             0x00
    [5] UPDATE            0x03
    [6] VALID             0x00
    [7] ATTRIBUTE_UPDATE  0x0b
    [8] VALID             0x00
    [9] SUSPENDED         0x02
  */
  const statusList = {
    status_list: {
      bits: 4,
      lst: "H4sIAAAAAAAEExNQMNigAABBpDD9BQAAAA",
    },
    sub: "https://example/wp",
    iat: 1778849463,
    exp: 1778935863,
  } satisfies StatusList;

  it.each([
    {
      idx: 0,
      expectedStatus: "VALID",
      expectedStatusBit: "0x00",
    },
    {
      idx: 1,
      expectedStatus: "INVALID",
      expectedStatusBit: "0x01",
    },
    {
      idx: 3,
      expectedStatus: "SUSPENDED",
      expectedStatusBit: "0x02",
    },
    {
      idx: 5,
      expectedStatus: "UPDATE",
      expectedStatusBit: "0x03",
    },
    {
      idx: 7,
      expectedStatus: "ATTRIBUTE_UPDATE",
      expectedStatusBit: "0x0B",
    },
  ])(
    "should extract the correct status and status bit for index $idx -> $expectedStatus",
    ({ idx, expectedStatus, expectedStatusBit }) => {
      const { status, statusBit } = getStatus(statusList, idx);
      expect(status).toBe(expectedStatus);
      expect(statusBit).toBe(expectedStatusBit);
    }
  );
});
