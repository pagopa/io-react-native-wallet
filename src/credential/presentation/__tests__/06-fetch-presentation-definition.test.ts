import { fetchPresentDefinition } from "../06-fetch-presentation-definition";
import { PresentationDefinition, RequestObject } from "../types";
import type { RelyingPartyEntityConfiguration } from "../../../trust/v1.0.0/types"; // TODO: [SIW-3742] refactor presentation

describe("fetchPresentDefinition", () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    // Save the original fetch so we can restore it later
    originalFetch = global.fetch;
  });

  beforeEach(() => {
    // Replace global.fetch with a Jest mock
    global.fetch = jest.fn();
  });

  afterAll(() => {
    // Restore the original fetch after all tests
    global.fetch = originalFetch;
  });

  it("returns the presentationDefinition from the request object if present", async () => {
    const mockRequestObject = {
      presentation_definition: {
        id: "test-direct",
      } as unknown as PresentationDefinition,
    } as unknown as RequestObject;

    const result = await fetchPresentDefinition(mockRequestObject);

    expect(result.presentationDefinition.id).toBe("test-direct");
  });

  it("returns the pre-configured presentationDefinition if 'scope' exists and no URI is provided", async () => {
    const mockRequestObject = {
      scope: "openid",
    } as unknown as RequestObject;

    const mockRpConf: RelyingPartyEntityConfiguration["payload"]["metadata"] = {
      openid_credential_verifier: {
        presentation_definition: {
          id: "test-preconfigured",
        } as unknown as PresentationDefinition,
      },
    } as unknown as RelyingPartyEntityConfiguration["payload"]["metadata"];

    const result = await fetchPresentDefinition(mockRequestObject, mockRpConf);

    expect(result.presentationDefinition.id).toBe("test-preconfigured");
  });

  it("throws an error if no presentation definition can be found", async () => {
    const mockRequestObject = {} as unknown as RequestObject;

    await expect(fetchPresentDefinition(mockRequestObject)).rejects.toThrow(
      "Presentation definition not found"
    );
  });
});
