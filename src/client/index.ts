import { parseRawHttpResponse } from "../utils/misc";
import { WalletProviderResponseError } from "../utils/errors";
import {
  ApiClient as WalletProviderApiClient,
  createApiClient as createWalletProviderApiClient,
  ProblemDetail,
} from "./generated/wallet-provider";

export type WalletProviderClient = WalletProviderApiClient;

const validateResponse = async (response: Response) => {
  if (!response.ok) {
    let problemDetail: ProblemDetail = {};
    try {
      problemDetail = ProblemDetail.parse(await response.json());
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
  walletProviderBaseUrl: string;
  appFetch?: GlobalFetch["fetch"];
}) => {
  const { walletProviderBaseUrl, appFetch = fetch } = context;

  return createWalletProviderApiClient(
    (method, url, params) =>
      appFetch(url, {
        method,
        body: params ? JSON.stringify(params.body) : undefined,
        headers: {
          "Content-Type": "application/json",
        },
      })
        .then(validateResponse)
        .then<string | Record<string, unknown>>(parseRawHttpResponse),
    walletProviderBaseUrl
  );
};
