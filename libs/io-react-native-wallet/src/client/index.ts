import { WalletProviderResponseError } from "../utils/errors";
import { parseRawHttpResponse } from "../utils/misc";
import {
  createApiClient as createWalletProviderApiClient,
  type EndpointParameters,
  ProblemJson,
  RemoteWscdProblem,
  ApiClient as WalletProviderApiClient,
} from "./generated/wallet-provider";

export type WalletProviderClient = WalletProviderApiClient;

type RawHttpResponse = Awaited<ReturnType<typeof parseRawHttpResponse>>;

const parseProblem = async (response: Response) => {
  try {
    const body = await response.json();
    // Zod tells Remote WSCD (HSM) problems apart: only they have a `code`, `retryable`, ...
    const remote = RemoteWscdProblem.safeParse(body);
    return remote.success
      ? {
          code: remote.data.code,
          problem: remote.data,
        }
      : { code: undefined, problem: ProblemJson.parse(body) };
  } catch {
    return {
      code: undefined,
      problem: { title: "Invalid response from Wallet Provider" },
    };
  }
};

const validateResponse = async (response: Response) => {
  if (!response.ok) {
    const { code, problem } = await parseProblem(response);

    throw new WalletProviderResponseError({
      code,
      message: problem.title ?? "Invalid response from Wallet Provider",
      reason: problem,
      statusCode: response.status,
    });
  }
  return response;
};

export const getWalletProviderClient = (context: {
  appFetch?: typeof fetch;
  walletProviderBaseUrl: string;
}) => {
  const { appFetch = fetch, walletProviderBaseUrl } = context;

  return createWalletProviderApiClient(
    (method, url, params) =>
      appFetch(interpolateUrl(url, params), {
        body: params?.body ? processBody(params.body) : undefined,
        headers: {
          // String bodies are raw JWTs (e.g. attestation requests)
          "Content-Type":
            typeof params?.body === "string"
              ? "text/plain"
              : "application/json",
          ...params?.header,
        },
        method,
      })
        .then(validateResponse)
        .then<RawHttpResponse>(parseRawHttpResponse),
    walletProviderBaseUrl,
  );
};

const processBody = (body: unknown): string =>
  typeof body === "string" ? body : JSON.stringify(body);

/**
 * Function to interpolate the url when the request includes path params.
 * The client generator expects the literal name of the param in the url
 * and passes the actual values in a separate object.
 */
export const interpolateUrl = (url: string, params?: EndpointParameters) => {
  if (!params?.path) return url;

  return Object.entries(params.path).reduce(
    (interpolatedUrl, [key, value]) =>
      typeof value === "string"
        ? interpolatedUrl.replace(`{${key}}`, value)
        : interpolatedUrl,
    url,
  );
};
