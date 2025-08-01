/**
 * Set up of the testing environment
 */

jest.mock("uuid", () => {
  return {
    v4: jest.fn(() => "mocked-uuid"),
  };
});

jest.mock("@pagopa/io-react-native-iso18013", () => {
  return {
    CBOR: {
      decodeIssuerSigned: jest.fn(() => Promise.resolve("test")),
    },
    COSE: {
      verify: jest.fn(() => Promise.resolve(true)),
    },
  };
});