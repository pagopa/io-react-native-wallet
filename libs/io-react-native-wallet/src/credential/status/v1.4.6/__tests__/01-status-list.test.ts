import {
  getStatusList,
  getStatusListByUri,
  getStatusListEntry,
} from "../01-status-list";
import { createMockCborDecoder } from "../../../../utils/__fixtures__/cbor";

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
      cborDecoder: createMockCborDecoder(),
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

describe("getStatusListEntry - mdoc", () => {
  it("reads the status list entry through the injected decoder", async () => {
    const cborDecoder = createMockCborDecoder();
    cborDecoder.decode.mockResolvedValue({
      issuerAuth: {
        payload: { status: { status_list: { idx: 3, uri: "https://sl" } } },
      },
    });

    await expect(
      getStatusListEntry("mdoc-token", "mso_mdoc", { cborDecoder }),
    ).resolves.toEqual({ idx: 3, uri: "https://sl" });
    expect(cborDecoder.decode).toHaveBeenCalledWith("mdoc-token");
  });

  it("throws when the decoded mdoc has no status list reference", async () => {
    const cborDecoder = createMockCborDecoder();

    await expect(
      getStatusListEntry("mdoc-token", "mso_mdoc", { cborDecoder }),
    ).rejects.toThrow("Status list reference not found in credential");
  });

  it("propagates decoder failures", async () => {
    const cborDecoder = createMockCborDecoder();
    cborDecoder.decode.mockRejectedValue(new Error("decode failed"));

    await expect(
      getStatusListEntry("mdoc-token", "mso_mdoc", { cborDecoder }),
    ).rejects.toThrow("decode failed");
  });
});
