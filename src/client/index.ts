import { WalletProviderResponseError } from "../utils/errors";
import {
  ProblemDetail,
  createApiClient as createWalletProviderApiClient,
} from "./generated/wallet-provider";
import { ApiClient as WalletProviderApiClient } from "./generated/wallet-provider";

export type WalletProviderClient = WalletProviderApiClient;

const validateResponse = async (response: Response) => {
  if (!response.ok) {
    let responseBody: ProblemDetail = {};
    try {
      responseBody = ProblemDetail.parse(await response.json());
    } catch {
      responseBody = {
        title: "Invalid response from Wallet Provider",
      };
    }

    throw new WalletProviderResponseError(
      responseBody.title ?? "Invalid response from Wallet Provider",
      JSON.stringify(responseBody), // Pass the stringified response body as error reason for further processing
      response.status
    );
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
        .then((res) => {
          const contentType = res.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            return res.json();
          }
          return res.text();
        }),
    walletProviderBaseUrl
  );
};
