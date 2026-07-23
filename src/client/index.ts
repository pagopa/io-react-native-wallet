import { WalletProviderResponseError } from "../utils/errors";
import { parseRawHttpResponse } from "../utils/misc";
import {
  createApiClient as createWalletProviderApiClient,
  type EndpointParameters,
  ProblemJson,
  ApiClient as WalletProviderApiClient,
} from "./generated/wallet-provider";

export type WalletProviderClient = WalletProviderApiClient;

type RawHttpResponse = Awaited<ReturnType<typeof parseRawHttpResponse>>;

const validateResponse = async (response: Response) => {
  if (!response.ok) {
    let problemDetail: ProblemJson = {};
    try {
      problemDetail = ProblemJson.parse(await response.json());
    } catch {
      problemDetail = {
        title: "Invalid response from Wallet Provider",
      };
    }

    throw new WalletProviderResponseError({
      message: problemDetail.title ?? "Invalid response from Wallet Provider",
      reason: problemDetail,
      statusCode: response.status,
    });
  }
  return response;
};

export const getWalletProviderClient = (context: {
  appFetch?: GlobalFetch["fetch"];
  walletProviderBaseUrl: string;
}) => {
  const { appFetch = fetch, walletProviderBaseUrl } = context;

  return createWalletProviderApiClient(
    (method, url, params) =>
      appFetch(interpolateUrl(url, params), {
        body: params?.body ? processBody(params.body) : undefined,
        headers: {
          "Content-Type": "application/json",
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
