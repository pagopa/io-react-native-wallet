import { deleteKey, generate } from "@pagopa/io-react-native-crypto";
import {
  getJwkFromCertificateChain,
  getJwkFromTrustChain,
  withEphemeralKey,
} from "../crypto";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useEphemeralKey", () => {
  it("should delete key on failure", async () => {
    const failingFn = () => Promise.reject("fail");

    const p = withEphemeralKey(failingFn);

    await expect(p).rejects.toEqual("fail");

    expect(generate).toBeCalledTimes(1);
    expect(deleteKey).toBeCalledTimes(1);
  });

  it("should delete key on success", async () => {
    const fn = () => Promise.resolve("ok");

    const result = await withEphemeralKey(fn);

    expect(result).toBe("ok");

    expect(generate).toBeCalledTimes(1);
    expect(deleteKey).toBeCalledTimes(1);
  });

  it("should delete only after the procedure has ended", async () => {
    let a: number = 0,
      b: number = -1;
    const fn = () =>
      new Promise((ok) => setTimeout((_) => ok((a = Date.now())), 1000));

    (deleteKey as jest.Mock).mockImplementationOnce(
      (_) => new Promise((ok) => setTimeout(() => ok((b = Date.now())), 100))
    );

    await withEphemeralKey(fn);

    expect(generate).toBeCalledTimes(1);
    expect(deleteKey).toBeCalledTimes(1);

    expect(a).toBeLessThan(b);
  });
});

describe("getJwkFromCertificateChain", () => {
  it("should extract the JWK from a certificate chain", async () => {
    expect(
      await getJwkFromCertificateChain([
        "MIIDDDCCArKgAwIBAgIUG8SguUrbgpJUvd6v+07Sp8utLfQwCgYIKoZIzj0EAwIwXDEeMBwGA1UEAwwVUElEIElzc3VlciBDQSAtIFVUIDAyMS0wKwYDVQQKDCRFVURJIFdhbGxldCBSZWZlcmVuY2UgSW1wbGVtZW50YXRpb24xCzAJBgNVBAYTAlVUMB4XDTI1MDQxMDA2NDU1OFoXDTI3MDQxMDA2NDU1N1owVzEdMBsGA1UEAwwURVVESSBSZW1vdGUgVmVyaWZpZXIxCjAIBgNVBAUTATExHTAbBgNVBAoMFEVVREkgUmVtb3RlIFZlcmlmaWVyMQswCQYDVQQGEwJVVDBZMBMGByqGSM49AgEGCCqGSM49AwEHA0IABOciV42mIT8nQMAN8kW9CHNUTYwkieem5hl1QsLf62kEbbZh6wul5iL28g/A3ZqcTX9XoLnw/nvJ8/HRp3+95eKjggFVMIIBUTAMBgNVHRMBAf8EAjAAMB8GA1UdIwQYMBaAFGLHlEcovQ+iFiCnmsJJlETxAdPHMDkGA1UdEQQyMDCBEm5vLXJlcGx5QGV1ZGl3LmRldoIadmVyaWZpZXItYmFja2VuZC5ldWRpdy5kZXYwEgYDVR0lBAswCQYHKIGMXQUBBjBDBgNVHR8EPDA6MDigNqA0hjJodHRwczovL3ByZXByb2QucGtpLmV1ZGl3LmRldi9jcmwvcGlkX0NBX1VUXzAyLmNybDAdBgNVHQ4EFgQUgAh9KsoYXYK8jndUbFQEtfDsHjYwDgYDVR0PAQH/BAQDAgeAMF0GA1UdEgRWMFSGUmh0dHBzOi8vZ2l0aHViLmNvbS9ldS1kaWdpdGFsLWlkZW50aXR5LXdhbGxldC9hcmNoaXRlY3R1cmUtYW5kLXJlZmVyZW5jZS1mcmFtZXdvcmswCgYIKoZIzj0EAwIDSAAwRQIgDFCgyEjGnJS25n/FfdP7HX0elz7C2q4uUQ/7Zcrl0QYCIQC/rrJpQ5sF1O4aiHejIPPLuO3JjdrLJPZSA+FQH+eIrA==",
      ])
    ).toEqual({
      crv: "P-256",
      kty: "EC",
      use: "sig",
      x: "5yJXjaYhPydAwA3yRb0Ic1RNjCSJ56bmGXVCwt_raQQ",
      y: "bbZh6wul5iL28g_A3ZqcTX9XoLnw_nvJ8_HRp3-95eI",
    });
  });
});

describe("getJwkFromTrustChain", () => {
  it("should extract the JWK from a trust chain (root jwks)", () => {
    expect(
      getJwkFromTrustChain(
        [
          "eyJhbGciOiJFUzI1NiIsInR5cCI6ImVudGl0eS1zdGF0ZW1lbnQrand0Iiwia2lkIjoiOWFhMTk3ZmEtNjNmOS00OWIyLWI0OGEtYjk0Mzg2OTNkYTA1In0.eyJpc3MiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwibWV0YWRhdGEiOnsib3BlbmlkX2NyZWRlbnRpYWxfaXNzdWVyIjp7Imp3a3MiOnsia2V5cyI6W3sia3R5IjoiRUMiLCJhbGciOiJFUzI1NiIsImtpZCI6IjkxNDk1ZjJiLTliOTgtNGI5NC1hOTI5LTI2ODFhZjIxNmJhYSIsImNydiI6IlAtMjU2IiwieCI6IjlMZkMxVVBsVy1aX0xoRzJVaHhqZi1qV2g2Mk9faDFtcHhDLU9YT01NTUEiLCJ5IjoiNzFxZlctQWpoNFJDX2VHM19fVm1jMGJJVjYxV3VNZ0F3OXdxUVZRdjlnMCJ9XX19fSwiandrcyI6eyJrZXlzIjpbeyJrdHkiOiJFQyIsImFsZyI6IkVTMjU2Iiwia2lkIjoiYzk0OWI1MGItNDg2OC00YmEzLTkzZjItY2IwOWVlODczNWNmIiwiY3J2IjoiUC0yNTYiLCJ4IjoiQ1BMVjJ5RlJ3NkxBT1FIeUZyWW9Zb3liTXFrYXNsak5ZWXVoOFlOWXhxcyIsInkiOiJPa2tUZG9wZ1BRSXNyVDJNQ0dPdm9kRFRQLUJtLUt6Qm1BaVVwdEkzaVlzIn1dfX0.URFouAJke0N4gZqP72wHkeDG_KbMQquBpuh8A2RKJqh7a_QFgelw7kgZn-5F8xk_sdOwJRCVLXrX9a_pfkTwyA",
        ],
        "c949b50b-4868-4ba3-93f2-cb09ee8735cf"
      )
    ).toEqual({
      kty: "EC",
      alg: "ES256",
      kid: "c949b50b-4868-4ba3-93f2-cb09ee8735cf",
      crv: "P-256",
      x: "CPLV2yFRw6LAOQHyFrYoYoybMqkasljNYYuh8YNYxqs",
      y: "OkkTdopgPQIsrT2MCGOvodDTP-Bm-KzBmAiUptI3iYs",
    });
  });

  it("should extract the JWK from a trust chain (metadata jwks)", () => {
    expect(
      getJwkFromTrustChain(
        [
          "eyJhbGciOiJFUzI1NiIsInR5cCI6ImVudGl0eS1zdGF0ZW1lbnQrand0Iiwia2lkIjoiOWFhMTk3ZmEtNjNmOS00OWIyLWI0OGEtYjk0Mzg2OTNkYTA1In0.eyJpc3MiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwibWV0YWRhdGEiOnsib3BlbmlkX2NyZWRlbnRpYWxfaXNzdWVyIjp7Imp3a3MiOnsia2V5cyI6W3sia3R5IjoiRUMiLCJhbGciOiJFUzI1NiIsImtpZCI6IjkxNDk1ZjJiLTliOTgtNGI5NC1hOTI5LTI2ODFhZjIxNmJhYSIsImNydiI6IlAtMjU2IiwieCI6IjlMZkMxVVBsVy1aX0xoRzJVaHhqZi1qV2g2Mk9faDFtcHhDLU9YT01NTUEiLCJ5IjoiNzFxZlctQWpoNFJDX2VHM19fVm1jMGJJVjYxV3VNZ0F3OXdxUVZRdjlnMCJ9XX19fSwiandrcyI6eyJrZXlzIjpbeyJrdHkiOiJFQyIsImFsZyI6IkVTMjU2Iiwia2lkIjoiYzk0OWI1MGItNDg2OC00YmEzLTkzZjItY2IwOWVlODczNWNmIiwiY3J2IjoiUC0yNTYiLCJ4IjoiQ1BMVjJ5RlJ3NkxBT1FIeUZyWW9Zb3liTXFrYXNsak5ZWXVoOFlOWXhxcyIsInkiOiJPa2tUZG9wZ1BRSXNyVDJNQ0dPdm9kRFRQLUJtLUt6Qm1BaVVwdEkzaVlzIn1dfX0.URFouAJke0N4gZqP72wHkeDG_KbMQquBpuh8A2RKJqh7a_QFgelw7kgZn-5F8xk_sdOwJRCVLXrX9a_pfkTwyA",
        ],
        "91495f2b-9b98-4b94-a929-2681af216baa"
      )
    ).toEqual({
      kty: "EC",
      alg: "ES256",
      kid: "91495f2b-9b98-4b94-a929-2681af216baa",
      crv: "P-256",
      x: "9LfC1UPlW-Z_LhG2Uhxjf-jWh62O_h1mpxC-OXOMMMA",
      y: "71qfW-Ajh4RC_eG3__Vmc0bIV61WuMgAw9wqQVQv9g0",
    });
  });
});
