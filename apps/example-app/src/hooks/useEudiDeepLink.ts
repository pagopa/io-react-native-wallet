import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";

import { useCallback, useEffect, useState } from "react";
import { Linking } from "react-native";

import type { MainStackNavParamList } from "../navigator/MainStackNavigator";

import {
  EUDI_CREDENTIAL_OFFER_SCHEMES,
  EUDI_PRESENTATION_REQUEST_SCHEMES,
} from "../utils/eudi";

type EudiDeepLink =
  | { offerUri: string; type: "offer" }
  | { requestUri: string; type: "presentation" };

const hasScheme = (url: string, schemes: string[]) =>
  schemes.some((scheme) => url.startsWith(scheme));

const toEudiDeepLink = (url: string): EudiDeepLink | undefined => {
  if (hasScheme(url, EUDI_CREDENTIAL_OFFER_SCHEMES)) {
    return { offerUri: url, type: "offer" };
  }
  if (hasScheme(url, EUDI_PRESENTATION_REQUEST_SCHEMES)) {
    return { requestUri: url, type: "presentation" };
  }
  return undefined;
};

/**
 * Opens the EUDI Credential Request screen when the app receives a Credential Offer as deep link,
 * and the EUDI Presentation screen when it receives a presentation request.
 * The deep link is kept until the navigation is ready and the user has access to the app.
 * @returns The callback to invoke when the navigation container is ready
 */
export const useEudiDeepLink = (
  navigationRef: NavigationContainerRefWithCurrent<MainStackNavParamList>,
  hasSessionAccess: boolean,
) => {
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [pendingDeepLink, setPendingDeepLink] = useState<EudiDeepLink>();

  useEffect(() => {
    const handleUrl = (url: null | string) => {
      const deepLink = url ? toEudiDeepLink(url) : undefined;
      if (deepLink) setPendingDeepLink(deepLink);
    };
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", ({ url }) =>
      handleUrl(url),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (pendingDeepLink && isNavigationReady && hasSessionAccess) {
      if (pendingDeepLink.type === "offer") {
        navigationRef.navigate("EudiCredentialRequest", {
          offerUri: pendingDeepLink.offerUri,
        });
      } else {
        navigationRef.navigate("EudiPresentation", {
          requestUri: pendingDeepLink.requestUri,
        });
      }
      setPendingDeepLink(undefined);
    }
  }, [hasSessionAccess, isNavigationReady, navigationRef, pendingDeepLink]);

  return useCallback(() => setIsNavigationReady(true), []);
};
