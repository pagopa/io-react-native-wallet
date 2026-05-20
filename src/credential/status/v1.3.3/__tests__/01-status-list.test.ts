import { getStatusList } from "../01-status-list";

describe("getStatusList", () => {
  const statusListMock =
    "eyJ0eXAiOiJzdGF0dXNsaXN0K2p3dCIsImFsZyI6IkVTMjU2Iiwia2lkIjoiMWJkNDM2N2ItMDllOS00NjEwLWJjYTUtZGZmNjllZGNlZjM2In0.eyJzdGF0dXNfbGlzdCI6eyJiaXRzIjo0LCJsc3QiOiJINHNJQUFBQUFBQUFFeE5RTU5pZ0FBQkJwREQ5QlFBQUFBIn0sInN1YiI6Imh0dHBzOi8vZXhhbXBsZS93cCIsImlhdCI6MTc3ODg0OTQ2MywiZXhwIjoxNzc4OTM1ODYzfQ.I8_pqFlkghh7KWLwaFL6z2gowZ8IzCN61UXzK-Yq4BB2Ntg9-GCdZmmhe40iwPzmW6tALzQ5LpDKBMs7SQ28tQ";

  it("should refetch the status list if the JWT is expired", async () => {
    const appFetchMock = jest.fn().mockImplementation(
      async () =>
        new Response(statusListMock, {
          status: 200,
          headers: { "Content-Type": "application/statuslist+jwt" },
        })
    );
    await getStatusList(
      "eyJhbGciOiJFUzI1NiIsInR5cCI6ImRjK3NkLWp3dCJ9.eyJzdGF0dXMiOnsic3RhdHVzX2xpc3QiOnsiaWR4IjoxLCJ1cmkiOiJtb2NrIn19fQ.80ktMRswY9lQBEUyG6nbR5ZhlPbN4mUwCAxmDOje2LEiYmLicKMlYspoh8GVDxYjpWte8s56HjVbmrQITxX6UA",
      "dc+sd-jwt",
      { appFetch: appFetchMock }
    );
    expect(appFetchMock).toHaveBeenCalledTimes(2);
    expect(appFetchMock).toHaveBeenNthCalledWith(2, "mock", {
      headers: {
        Accept: "application/statuslist+jwt",
        "Cache-Control": "no-cache",
      },
    });
  });
});
