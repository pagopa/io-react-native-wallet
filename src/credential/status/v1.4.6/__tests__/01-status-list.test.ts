import { getStatusList, getStatusListByUri } from "../01-status-list";

describe("getStatusList", () => {
  const statusListJwt = makeJwt({
    extra_claim: "kept",
    iat: 1778849463,
    iss: "https://example/issuer",
    status_list: {
      aggregation_uri: "https://example/status-list-aggregation",
      bits: 4,
      lst: "H4sIAAAAAAAEExNQMNigAABBpDD9BQAAAA",
    },
    sub: "https://example/status-list",
    ttl: 3600,
  });
  const credential = makeJwt({
    status: {
      status_list: {
        idx: 1,
        uri: "https://example/status-list",
      },
    },
  });

  it("should fetch the status list token and reference metadata", async () => {
    const appFetchMock = jest.fn().mockResolvedValue(response(statusListJwt));

    const result = await getStatusList(credential, "dc+sd-jwt", {
      appFetch: appFetchMock,
    });

    expect(result).toEqual({
      format: "jwt",
      idx: 1,
      statusList: statusListJwt,
      uri: "https://example/status-list",
    });
    expect(appFetchMock).toHaveBeenCalledWith("https://example/status-list", {
      headers: {
        Accept: "application/statuslist+jwt",
      },
    });
  });

  it("should fetch the raw status list token by uri", async () => {
    const appFetchMock = jest.fn().mockResolvedValue(response(statusListJwt));

    const result = await getStatusListByUri("https://example/status-list", {
      appFetch: appFetchMock,
    });

    expect(result).toBe(statusListJwt);
  });
});

function base64url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function makeJwt(payload: unknown) {
  return [
    base64url({ alg: "ES256", typ: "statuslist+jwt" }),
    base64url(payload),
    "signature",
  ].join(".");
}

function response(body: string) {
  return new Response(body, {
    headers: { "Content-Type": "application/statuslist+jwt" },
    status: 200,
  });
}
