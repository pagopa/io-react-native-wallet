import { getStatusList, getStatusListByUri } from "../01-status-list";

describe("getStatusList", () => {
  const statusListJwt = makeJwt({
    sub: "https://example/status-list",
    iss: "https://example/issuer",
    iat: 1778849463,
    ttl: 3600,
    status_list: {
      bits: 4,
      lst: "H4sIAAAAAAAEExNQMNigAABBpDD9BQAAAA",
      aggregation_uri: "https://example/status-list-aggregation",
    },
    extra_claim: "kept",
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
      statusList: statusListJwt,
      format: "jwt",
      uri: "https://example/status-list",
      idx: 1,
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

function makeJwt(payload: unknown) {
  return [
    base64url({ typ: "statuslist+jwt", alg: "ES256" }),
    base64url(payload),
    "signature",
  ].join(".");
}

function base64url(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function response(body: string) {
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/statuslist+jwt" },
  });
}
