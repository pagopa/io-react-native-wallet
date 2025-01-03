/**
 * Set up of the testing environment
 */

jest.mock("uuid", () => {
  return {
    v4: jest.fn(() => "mocked-uuid"),
  };
});