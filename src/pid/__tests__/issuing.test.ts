import { Issuing } from "../issuing";

const mockJwkDecode = (jwt: string) => {
  const [encodedHeader, encodedPayload, _signature] = jwt.split(".");
  const payload = JSON.parse(atob(encodedPayload as string));
  const protectedHeader = JSON.parse(atob(encodedHeader as string));
  return { payload, protectedHeader };
};

jest.mock("react-native-uuid", () => ({
  v4: jest.fn(() => Math.random().toString(36).substr(2, 5)),
}));

jest.mock("@pagopa/io-react-native-jwt", () => ({
  decode: jest.fn((jwt) => mockJwkDecode(jwt)),
  verify: jest.fn((jwt, _) => mockJwkDecode(jwt)),
}));

const responseJwt =
  "eyJhbGciOiJFUzI1NiIsImtpZCI6IjV0NVlZcEJoTi1FZ0lFRUk1aVV6cjZyME1SMDJMblZRME9tZWttTktjalkiLCJ0eXAiOiJ2YXIrand0In0.eyJpc3MiOiI1dDVZWXBCaE4tRWdJRUVJNWlVenI2cjBNUjAyTG5WUTBPbWVrbU5LY2pZIiwic3ViIjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIuZXhhbXBsZS5vcmciLCJqd2tzIjp7ImtleXMiOlt7ImNydiI6IlAtMjU2Iiwia3R5IjoiRUMiLCJ4IjoicXJKcmozQWZfQjU3c2JPSVJyY0JNN2JyN3dPYzh5bmo3bEhGUFRlZmZVayIsInkiOiIxSDBjV0R5R2d2VTh3LWtQS1VfeHljT0NVTlQybzBid3NsSVF0blBVNmlNIiwia2lkIjoiNXQ1WVlwQmhOLUVnSUVFSTVpVXpyNnIwTVIwMkxuVlEwT21la21OS2NqWSJ9XX0sIm1ldGFkYXRhIjp7Im9wZW5pZF9jcmVkZW50aWFsX2lzc3VlciI6eyJjcmVkZW50aWFsX2lzc3VlciI6Imh0dHBzOi8vcGlkLXByb3ZpZGVyLmV4YW1wbGUub3JnIiwiYXV0aG9yaXphdGlvbl9lbmRwb2ludCI6Imh0dHBzOi8vcGlkLXByb3ZpZGVyLmV4YW1wbGUub3JnL2Nvbm5lY3QvYXV0aG9yaXplIiwidG9rZW5fZW5kcG9pbnQiOiJodHRwczovL3BpZC1wcm92aWRlci5leGFtcGxlLm9yZy9jb25uZWN0L3Rva2VuIiwicHVzaGVkX2F1dGhvcml6YXRpb25fcmVxdWVzdF9lbmRwb2ludCI6Imh0dHBzOi8vcGlkLXByb3ZpZGVyLmV4YW1wbGUub3JnL2Nvbm5lY3QvcGFyIiwiZHBvcF9zaWduaW5nX2FsZ192YWx1ZXNfc3VwcG9ydGVkIjpbIlJTMjU2IiwiUlM1MTIiLCJFUzI1NiIsIkVTNTEyIl0sImNyZWRlbnRpYWxfZW5kcG9pbnQiOiJodHRwczovL3BpZC1wcm92aWRlci5leGFtcGxlLm9yZy9jcmVkZW50aWFsIiwiY3JlZGVudGlhbHNfc3VwcG9ydGVkIjp7ImV1LmV1ZGl3LnBpZC5pdCI6eyJmb3JtYXQiOiJ2YytzZC1qd3QiLCJjcnlwdG9ncmFwaGljX2JpbmRpbmdfbWV0aG9kc19zdXBwb3J0ZWQiOlsiandrIl0sImNyeXB0b2dyYXBoaWNfc3VpdGVzX3N1cHBvcnRlZCI6WyJSUzI1NiIsIlJTNTEyIiwiRVMyNTYiLCJFUzUxMiJdLCJkaXNwbGF5IjpbeyJuYW1lIjoiUElEIFByb3ZpZGVyIEl0YWxpYW5vIGRpIGVzZW1waW8iLCJsb2NhbGUiOiJpdC1JVCIsImxvZ28iOnsidXJsIjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIgZXhhbXBsZS5vcmcvcHVibGljL2xvZ28uc3ZnIiwiYWx0X3RleHQiOiJsb2dvIGRpIHF1ZXN0byBQSUQgUHJvdmlkZXIifSwiYmFja2dyb3VuZF9jb2xvciI6IiMxMjEwN2MiLCJ0ZXh0X2NvbG9yIjoiI0ZGRkZGRiJ9LHsibmFtZSI6IkV4YW1wbGUgSXRhbGlhbiBQSUQgUHJvdmlkZXIiLCJsb2NhbGUiOiJlbi1VUyIsImxvZ28iOnsidXJsIjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIuZXhhbXBsZS5vcmcvcHVibGljL2xvZ28uc3ZnIiwiYWx0X3RleHQiOiJUaGUgbG9nbyBvZiB0aGlzIFBJRCBQcm92aWRlciJ9LCJiYWNrZ3JvdW5kX2NvbG9yIjoiIzEyMTA3YyIsInRleHRfY29sb3IiOiIjRkZGRkZGIn1dLCJjcmVkZW50aWFsX2RlZmluaXRpb24iOnsidHlwZSI6WyJQSURDcmVkZW50aWFsIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7ImdpdmVuX25hbWUiOnsibWFuZGF0b3J5Ijp0cnVlLCJkaXNwbGF5IjpbeyJuYW1lIjoiQ3VycmVudCBGaXJzdCBOYW1lIiwibG9jYWxlIjoiZW4tVVMifSx7Im5hbWUiOiJOb21lIiwibG9jYWxlIjoiaXQtSVQifV19LCJmYW1pbHlfbmFtZSI6eyJtYW5kYXRvcnkiOnRydWUsImRpc3BsYXkiOlt7Im5hbWUiOiJDdXJyZW50IEZhbWlseSBOYW1lIiwibG9jYWxlIjoiZW4tVVMifSx7Im5hbWUiOiJDb2dub21lIiwibG9jYWxlIjoiaXQtSVQifV19LCJiaXJ0aGRhdGUiOnsibWFuZGF0b3J5Ijp0cnVlLCJkaXNwbGF5IjpbeyJuYW1lIjoiRGF0ZSBvZiBCaXJ0aCIsImxvY2FsZSI6ImVuLVVTIn0seyJuYW1lIjoiRGF0YSBkaSBOYXNjaXRhIiwibG9jYWxlIjoiaXQtSVQifV19LCJwbGFjZV9vZl9iaXJ0aCI6eyJtYW5kYXRvcnkiOnRydWUsImRpc3BsYXkiOlt7Im5hbWUiOiJQbGFjZSBvZiBCaXJ0aCIsImxvY2FsZSI6ImVuLVVTIn0seyJuYW1lIjoiTHVvZ28gZGkgTmFzY2l0YSIsImxvY2FsZSI6Iml0LUlUIn1dfSwidW5pcXVlX2lkIjp7Im1hbmRhdG9yeSI6dHJ1ZSwiZGlzcGxheSI6W3sibmFtZSI6IlVuaXF1ZSBJZGVudGlmaWVyIiwibG9jYWxlIjoiZW4tVVMifSx7Im5hbWUiOiJJZGVudGlmaWNhdGl2byB1bml2b2NvIiwibG9jYWxlIjoiaXQtSVQifV19LCJ0YXhfaWRfbnVtYmVyIjp7Im1hbmRhdG9yeSI6dHJ1ZSwiZGlzcGxheSI6W3sibmFtZSI6IlRheCBJZCBOdW1iZXIiLCJsb2NhbGUiOiJlbi1VUyJ9LHsibmFtZSI6IkNvZGljZSBGaXNjYWxlIiwibG9jYWxlIjoiaXQtSVQifV19fX19fX0sImZlZGVyYXRpb25fZW50aXR5Ijp7Im9yZ2FuaXphdGlvbl9uYW1lIjoiUGlkIFByb3ZpZGVyIE9yZ2FuaXphdGlvbiBFeGFtcGxlIiwiaG9tZXBhZ2VfdXJpIjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIuZXhhbXBsZS5vcmciLCJwb2xpY3lfdXJpIjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIuZXhhbXBsZS5vcmcvcHJpdmFjeV9wb2xpY3kiLCJ0b3NfdXJpIjoiaHR0cHM6Ly9waWQtcHJvdmlkZXIuZXhhbXBsZS5vcmcvaW5mb19wb2xpY3kiLCJsb2dvX3VyaSI6Imh0dHBzOi8vcGlkLXByb3ZpZGVyLmV4YW1wbGUub3JnL2xvZ28uc3ZnIn19LCJpYXQiOjE2OTE1NzM2OTcsImV4cCI6MjAwNzE0OTY5N30.38sjbLUnYkybB4rRbgBlfDfrMmEdacLbLeIwxhFMjXPIZE153fnQTurXuXlca4Jfnnk8SkYM_o3iqsv8fVXGJA";

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
      credentials_supported: {
        "eu.eudiw.pid.it": {
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
      },
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
  "http://pid-provider.example.com",
  "http://wallet-provider.example.com",
  "ey......",
  "id00"
);

describe("PID issuing metadata", () => {
  it("should decode metadata", async () => {
    expect(await pidIssuing.getMetadata()).toEqual(decodedMetadata);
  });
});
