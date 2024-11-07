import { Errors, Misc } from "@pagopa/io-react-native-wallet";
import { Linking } from "react-native";

export type OpenUrlAndListenForAuthRedirect = (
  redirectUri: string,
  authUrl: string,
  signal?: AbortSignal
) => Promise<{
  authRedirectUrl: string;
}>;

/**
 * Opens the authentication URL for CIE L2 and listens for the authentication redirect URL.
 * This function opens an in-app browser to navigate to the provided authentication URL.
 * It listens for the redirect URL containing the authorization response and returns it.
 * If the 302 redirect happens and the redirectSchema is caught, the function will return the authorization Redirect Url .
 * @param redirectUri The URL to which the end user should be redirected to complete the authentication flow
 * @param authUrl The URL to which the end user should be redirected to start the authentication flow
 * @param signal An optional {@link AbortSignal} to abort the operation when using the default browser
 * @returns An object containing the authorization redirect URL
 * @throws {Errors.AuthorizationError} if an error occurs during the authorization process
 * @throws {Errors.OperationAbortedError} if the caller aborts the operation via the provided signal
 */
export const openUrlAndListenForAuthRedirect: OpenUrlAndListenForAuthRedirect =
  async (redirectUri, authUrl, signal) => {
    let authRedirectUrl: string | undefined;

    if (redirectUri && authUrl) {
      const urlEventListener = Linking.addEventListener("url", ({ url }) => {
        if (url.includes(redirectUri)) {
          authRedirectUrl = url;
        }
      });

      const operationIsAborted = signal
        ? Misc.createAbortPromiseFromSignal(signal)
        : undefined;
      await Linking.openURL(authUrl);

      /*
       * Waits for 120 seconds for the authRedirectUrl variable to be set
       * by the custom url handler. If the timeout is exceeded, throw an exception
       */
      const untilAuthRedirectIsNotUndefined = Misc.until(
        () => authRedirectUrl !== undefined,
        120
      );

      /**
       * Simultaneously listen for the abort signal (when provided) and the redirect url.
       * The first event that occurs will resolve the promise.
       * This is useful to properly cleanup when the caller aborts this operation.
       */
      const winner = await Promise.race(
        [operationIsAborted?.listen(), untilAuthRedirectIsNotUndefined].filter(
          Misc.isDefined
        )
      ).finally(() => {
        urlEventListener.remove();
        operationIsAborted?.remove();
      });

      if (winner === "OPERATION_ABORTED") {
        throw new Errors.OperationAbortedError("DefaultQueryModeAuthorization");
      }
    }

    if (authRedirectUrl === undefined) {
      throw new Errors.AuthorizationError(
        "Invalid authentication redirect url"
      );
    }

    return { authRedirectUrl };
  };
