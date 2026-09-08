import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  H3,
  IOVisualCostants,
  useIOToast,
  VSpacer,
} from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import type { MainStackNavParamList } from "../navigator/MainStackNavigator";
import type { CredentialResult } from "../store/types";

import { QrCodeImage } from "../components/QrCodeImage";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import {
  selectCredential,
  selectObtainedCredentials,
  selectTrustmark,
  selectTrustmarkAsyncStatus,
  trustmarkReset,
} from "../store/reducers/credential";
import { selectEnv } from "../store/reducers/environment";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { getTrustmarkThunk } from "../thunks/trustmark";
import { getEnv } from "../utils/environment";
import { iconByCredentialType, labelByCredentialType } from "../utils/ui";

type TrustmarkQrCodeScreenProps = NativeStackScreenProps<
  MainStackNavParamList,
  "TrustmarkQrCode"
>;

/**
 * This screen is for displaying the credentials available for obtaining a trustmark
 */
export const TrustmarkScreen = () => {
  const navigation = useNavigation();
  const credentials = useAppSelector(selectObtainedCredentials);

  const scenarios: (TestScenarioProp | undefined)[] = useMemo(
    () =>
      Object.values(credentials)
        .filter((_) => !!_)
        .map(({ credentialType }) => ({
          hasError: { error: undefined, status: false },
          icon: iconByCredentialType[credentialType],
          isDone: false,
          isLoading: false,
          onPress: () =>
            navigation.navigate("TrustmarkQrCode", { credentialType }),
          title: `Get Trustmark (${labelByCredentialType[credentialType]})`,
        })),
    [navigation, credentials],
  );

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={{
          margin: IOVisualCostants.appMarginDefault,
        }}
        data={scenarios}
        keyExtractor={(item, index) => `${item?.title}-${index}`}
        renderItem={({ item }) => (
          <>
            {item && (
              <>
                <TestScenario
                  hasError={item.hasError}
                  icon={item.icon}
                  isDone={item.isDone}
                  isLoading={item.isLoading}
                  isPresent={item.isPresent}
                  onPress={item.onPress}
                  title={item.title}
                />
                <VSpacer />
              </>
            )}
          </>
        )}
        style={styles.list}
      />
    </View>
  );
};

/**
 * This screen is for displays a credential trustmark
 */
export const TrustmarkQrCodeScreen = ({
  route,
}: TrustmarkQrCodeScreenProps) => {
  const { credentialType } = route.params;
  const dispatch = useAppDispatch();
  const toast = useIOToast();
  const trustmark = useAppSelector(selectTrustmark(credentialType));
  const trustmarkAsyncStatus = useAppSelector(
    selectTrustmarkAsyncStatus(credentialType),
  );
  const credential = useAppSelector(selectCredential(credentialType));
  const selectedEnv = useAppSelector(selectEnv);
  const { VERIFIER_BASE_URL } = getEnv(selectedEnv);
  const [hasLoaded, setHasLoaded] = useState(false);

  useDebugInfo({
    expirationTime: trustmark?.expirationTime,
    trustmarkAsyncStatus,
    trustmarkJwt: trustmark?.trustmarkJwt,
  });

  React.useEffect(() => {
    if (credential) {
      setHasLoaded(true);

      const documentNumber = getCredentialDocumentNumber(credential);
      dispatch(getTrustmarkThunk({ credentialType, documentNumber }));

      return () => {
        dispatch(trustmarkReset(credentialType));
      };
    }

    return undefined;
  }, [dispatch, credential, credentialType]);

  useEffect(() => {
    if (trustmarkAsyncStatus.hasError.status && hasLoaded) {
      toast.error("An error occured, check the debug info");
      setHasLoaded(false);
    }
  }, [trustmarkAsyncStatus.hasError.status, hasLoaded, toast]);

  if (trustmark === undefined) {
    return null;
  }

  const { expirationTime, trustmarkJwt } = trustmark;
  const trustmarkUrl = `${VERIFIER_BASE_URL}?tm=${trustmarkJwt}`;

  return (
    <View style={styles.trustmarkContainer}>
      <QrCodeImage correctionLevel="L" size={"90%"} value={trustmarkUrl} />
      <ExpirationTimer time={expirationTime} />
    </View>
  );
};

/**
 * Returns the document number for a credential, if applicable
 * @param credential the credential from which to extract the document number
 * @returns a string representing the document number, undefined if not found
 */
const getCredentialDocumentNumber = (
  credential: CredentialResult | undefined,
): string | undefined =>
  credential?.parsedCredential.document_number?.value as string;

/**
 * Display a countdown timer for the QR Code expiration time
 * @param time timestamp in seconds for the expiration
 */
const ExpirationTimer = ({ time }: { time: number }) => {
  const [timeLeft, setTimeLeft] = React.useState(time - Date.now() / 1000);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (timeLeft <= 0) {
    <H3 color="error-600">Expired</H3>;
  }

  return (
    <H3>
      {`Expires in: ${Math.floor(timeLeft / 60)}:${Math.floor(timeLeft % 60)
        .toString()
        .padStart(2, "0")}`}
    </H3>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    flex: 1,
    flexGrow: 1,
  },
  trustmarkContainer: {
    alignContent: "center",
    alignItems: "center",
    flex: 1,
    flexGrow: 2,
    justifyContent: "center",
    paddingBottom: IOVisualCostants.appMarginDefault,
  },
});
