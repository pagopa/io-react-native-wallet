import type { NavigationContainerRefWithCurrent } from "@react-navigation/native";

import { useCallback, useEffect, useState } from "react";
import { Linking } from "react-native";

import type { MainStackNavParamList } from "../navigator/MainStackNavigator";

import { EUDI_CREDENTIAL_OFFER_SCHEMES } from "../utils/eudi";

const isEudiCredentialOffer = (url: string) =>
  EUDI_CREDENTIAL_OFFER_SCHEMES.some((scheme) => url.startsWith(scheme));

/**
 * Opens the EUDI Credential Request screen when the app receives a Credential Offer as deep link.
 * The offer is kept until the navigation is ready and the user has access to the app.
 * @returns The callback to invoke when the navigation container is ready
 */
export const useEudiOfferDeepLink = (
  navigationRef: NavigationContainerRefWithCurrent<MainStackNavParamList>,
  hasSessionAccess: boolean,
) => {
  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [pendingOfferUri, setPendingOfferUri] = useState<string>();

  useEffect(() => {
    const handleUrl = (url: null | string) => {
      if (url && isEudiCredentialOffer(url)) setPendingOfferUri(url);
    };
    Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener("url", ({ url }) =>
      handleUrl(url),
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (pendingOfferUri && isNavigationReady && hasSessionAccess) {
      navigationRef.navigate("EudiCredentialRequest", {
        offerUri: pendingOfferUri,
      });
      setPendingOfferUri(undefined);
    }
  }, [hasSessionAccess, isNavigationReady, navigationRef, pendingOfferUri]);

  return useCallback(() => setIsNavigationReady(true), []);
};
