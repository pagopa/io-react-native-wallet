import { createCryptoContextFor } from "../../utils/crypto";
import { Issuing } from "../issuing";

const responseJwt =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6IjV0NVlZcEJoTi1FZ0lFRUk1aVV6cjZyME1SMDJMblZRME9tZWttTktjalkiLCJ0eXAiOiJ2YXIrand0In0.eyJqd2tzIjp7ImtleXMiOlt7ImNydiI6IlAtMjU2Iiwia2lkIjoiNXQ1WVlwQmhOLUVnSUVFSTVpVXpyNnIwTVIwMkxuVlEwT21la21OS2NqWSIsImt0eSI6IkVDIiwieCI6InFySnJqM0FmX0I1N3NiT0lScmNCTTdicjd3T2M4eW5qN2xIRlBUZWZmVWsiLCJ5IjoiMUgwY1dEeUdndlU4dy1rUEtVX3h5Y09DVU5UMm8wYndzbElRdG5QVTZpTSJ9XX0sIm1ldGFkYXRhIjp7ImZlZGVyYXRpb25fZW50aXR5Ijp7ImhvbWVwYWdlX3VyaSI6Imh0dHBzOi8vcGlkLXByb3ZpZGVyLmV4YW1wbGUub3JnIiwibG9nb191cmkiOiJodHRwczovL3BpZC1wcm92aWRlci5leGFtcGxlLm9yZy9sb2dvLnN2ZyIsIm9yZ2FuaXphdGlvbl9uYW1lIjoiUGlkIFByb3ZpZGVyIE9yZ2FuaXphdGlvbiBFeGFtcGxlIiwicG9saWN5X3VyaSI6Imh0dHBzOi8vcGlkLXByb3ZpZGVyLmV4YW1wbGUub3JnL3ByaXZhY3lfcG9saWN5IiwidG9zX3VyaSI6Imh0dHBzOi8vcGlkLXByb3ZpZGVyLmV4YW1wbGUub3JnL2luZm9fcG9saWN5In0sIm9wZW5pZF9jcmVkZW50aWFsX2lzc3VlciI6eyJhdXRob3JpemF0aW9uX2VuZHBvaW50IjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIuZXhhbXBsZS5vcmcvY29ubmVjdC9hdXRob3JpemUiLCJjcmVkZW50aWFsX2VuZHBvaW50IjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIuZXhhbXBsZS5vcmcvY3JlZGVudGlhbCIsImNyZWRlbnRpYWxfaXNzdWVyIjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIuZXhhbXBsZS5vcmciLCJjcmVkZW50aWFsc19zdXBwb3J0ZWQiOlt7ImNyeXB0b2dyYXBoaWNfYmluZGluZ19tZXRob2RzX3N1cHBvcnRlZCI6WyJqd2siXSwiY3J5cHRvZ3JhcGhpY19zdWl0ZXNfc3VwcG9ydGVkIjpbIlJTMjU2IiwiUlM1MTIiLCJFUzI1NiIsIkVTNTEyIl0sImRpc3BsYXkiOlt7ImJhY2tncm91bmRfY29sb3IiOiIjMTIxMDdjIiwibG9jYWxlIjoiaXQtSVQiLCJsb2dvIjp7ImFsdF90ZXh0IjoibG9nbyBkaSBxdWVzdG8gUElEIFByb3ZpZGVyIiwidXJsIjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIgZXhhbXBsZS5vcmcvcHVibGljL2xvZ28uc3ZnIn0sIm5hbWUiOiJQSUQgUHJvdmlkZXIgSXRhbGlhbm8gZGkgZXNlbXBpbyIsInRleHRfY29sb3IiOiIjRkZGRkZGIn0seyJiYWNrZ3JvdW5kX2NvbG9yIjoiIzEyMTA3YyIsImxvY2FsZSI6ImVuLVVTIiwibG9nbyI6eyJhbHRfdGV4dCI6IlRoZSBsb2dvIG9mIHRoaXMgUElEIFByb3ZpZGVyIiwidXJsIjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIuZXhhbXBsZS5vcmcvcHVibGljL2xvZ28uc3ZnIn0sIm5hbWUiOiJFeGFtcGxlIEl0YWxpYW4gUElEIFByb3ZpZGVyIiwidGV4dF9jb2xvciI6IiNGRkZGRkYifV0sImZvcm1hdCI6InZjK3NkLWp3dCJ9XSwiZHBvcF9zaWduaW5nX2FsZ192YWx1ZXNfc3VwcG9ydGVkIjpbIlJTMjU2IiwiUlM1MTIiLCJFUzI1NiIsIkVTNTEyIl0sInB1c2hlZF9hdXRob3JpemF0aW9uX3JlcXVlc3RfZW5kcG9pbnQiOiJodHRwczovL3BpZC1wcm92aWRlci5leGFtcGxlLm9yZy9jb25uZWN0L3BhciIsInRva2VuX2VuZHBvaW50IjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIuZXhhbXBsZS5vcmcvY29ubmVjdC90b2tlbiJ9fX0.WEt1BWnRea_nEI4l3ibFp1AWP34t9xcy6wj5OqZu4C82WYOR2oU3mQNTNJ8nm1qEF2wmjoTWRGYPzOyZDkMGBQ";

const decodedMetadata = {
  jwks: {
    keys: [
      {
        crv: "P-256",
        kid: "5t5YYpBhN-EgIEEI5iUzr6r0MR02LnVQ0OmekmNKcjY",
        kty: "EC",
        x: "qrJrj3Af_B57sbOIRrcBM7br7wOc8ynj7lHFPTeffUk",
        y: "1H0cWDyGgvU8w-kPKU_xycOCUNT2o0bwslIQtnPU6iM",
      },
    ],
  },
  metadata: {
    federation_entity: {
      homepage_uri: "https://pid-provider.example.org",
      logo_uri: "https://pid-provider.example.org/logo.svg",
      organization_name: "Pid Provider Organization Example",
      policy_uri: "https://pid-provider.example.org/privacy_policy",
      tos_uri: "https://pid-provider.example.org/info_policy",
    },
    openid_credential_issuer: {
      authorization_endpoint:
        "https://pid-provider.example.org/connect/authorize",
      credential_endpoint: "https://pid-provider.example.org/credential",
      credential_issuer: "https://pid-provider.example.org",
      credentials_supported: [
        {
          cryptographic_binding_methods_supported: ["jwk"],
          cryptographic_suites_supported: ["RS256", "RS512", "ES256", "ES512"],
          display: [
            {
              background_color: "#12107c",
              locale: "it-IT",
              logo: {
                alt_text: "logo di questo PID Provider",
                url: "https://pid-provider example.org/public/logo.svg",
              },
              name: "PID Provider Italiano di esempio",
              text_color: "#FFFFFF",
            },
            {
              background_color: "#12107c",
              locale: "en-US",
              logo: {
                alt_text: "The logo of this PID Provider",
                url: "https://pid-provider.example.org/public/logo.svg",
              },
              name: "Example Italian PID Provider",
              text_color: "#FFFFFF",
            },
          ],
          format: "vc+sd-jwt",
        },
      ],
      dpop_signing_alg_values_supported: ["RS256", "RS512", "ES256", "ES512"],
      pushed_authorization_request_endpoint:
        "https://pid-provider.example.org/connect/par",
      token_endpoint: "https://pid-provider.example.org/connect/token",
    },
  },
};

global.fetch = jest.fn(async () =>
  Promise.resolve({
    text: async () => Promise.resolve(responseJwt),
    status: 200,
  })
) as jest.Mock;

const pidIssuing = new Issuing(
  "http://pid-provider.example.com", // pid base url
  "http://wallet-provider.example.com", // wallet provider base url
  "ey......", // signed wallet instance attestation token
  createCryptoContextFor("PID-KEYS"),
  createCryptoContextFor("WIA-KEYS")
);

describe("PID issuing metadata", () => {
  it("should decode metadata", async () => {
    expect(await pidIssuing.getEntityConfiguration()).toEqual(decodedMetadata);
  });
});
