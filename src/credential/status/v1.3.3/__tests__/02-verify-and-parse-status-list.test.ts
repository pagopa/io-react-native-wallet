import { verifyAndParseStatusList } from "../02-verify-and-parse-status-list";

jest.mock("@pagopa/io-react-native-jwt", () => ({
  verify: jest.fn(),
}));

describe("verifyAndParseStatusList", () => {
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
  const statusList =
    "eyJ0eXAiOiJzdGF0dXNsaXN0K2p3dCIsImFsZyI6IkVTMjU2Iiwia2lkIjoiMWJkNDM2N2ItMDllOS00NjEwLWJjYTUtZGZmNjllZGNlZjM2In0.eyJzdGF0dXNfbGlzdCI6eyJiaXRzIjo0LCJsc3QiOiJINHNJQUFBQUFBQUFFeE5RTU5pZ0FBQkJwREQ5QlFBQUFBIn0sInN1YiI6Imh0dHBzOi8vZXhhbXBsZS93cCIsImlhdCI6MTc3ODg0OTQ2MywiZXhwIjoxNzc4OTM1ODYzfQ.I8_pqFlkghh7KWLwaFL6z2gowZ8IzCN61UXzK-Yq4BB2Ntg9-GCdZmmhe40iwPzmW6tALzQ5LpDKBMs7SQ28tQ";

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
    async ({ idx, expectedStatus, expectedStatusBit }) => {
      const { status, statusBit } = await verifyAndParseStatusList([], {
        format: "jwt",
        uri: "https://example/wp/status-list",
        statusList,
        idx,
      });
      expect(status).toBe(expectedStatus);
      expect(statusBit).toBe(expectedStatusBit);
    }
  );
});
