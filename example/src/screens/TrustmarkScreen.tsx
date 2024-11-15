import { H3, IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import React, { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { QrCodeImage } from "../components/QrCodeImage";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import { selectCredentials } from "../store/reducers/credential";
import { selectEnv } from "../store/reducers/environment";
import {
  selectTrustmarkAsyncStatus,
  selectTrustmarkJwt,
  trustmarkReset,
} from "../store/reducers/trustmark";
import type { CredentialResult } from "../store/types";
import { useAppDispatch, useAppSelector } from "../store/utils";
import { getTrustmarkThunk } from "../thunks/trustmark";
import { getEnv } from "../utils/environment";

const getCredentialDocumentNumber = (
  credential: CredentialResult | undefined
): string | undefined => {
  if (credential === undefined) {
    return undefined;
  }

  return credential.parsedCredential.document_number?.value as string;
};

/**
 * This screen is for displaying the trustmark of an obtained credential
 */
export const TrustmarkScreen = () => {
  const dispatch = useAppDispatch();
  const credentials = useAppSelector(selectCredentials);
  const trustmarkJwt = useAppSelector(selectTrustmarkJwt);
  const trustmarkAsyncStatus = useAppSelector(selectTrustmarkAsyncStatus);

  useDebugInfo({
    trustmarkJwt,
    trustmarkAsyncStatus,
  });

  /**
   * Resets the trustmark when leaving this screen
   */
  React.useEffect(() => {
    return () => {
      dispatch(trustmarkReset());
    };
  }, [dispatch]);

  const scenarios: Array<TestScenarioProp | undefined> = useMemo(
    () => [
      credentials.MDL
        ? {
            title: "Get Trustmark (MDL)",
            onPress: () =>
              dispatch(
                getTrustmarkThunk({
                  credentialType: "MDL",
                  documentNumber: getCredentialDocumentNumber(credentials.MDL),
                })
              ),
            isLoading: trustmarkAsyncStatus.isLoading,
            hasError: trustmarkAsyncStatus.hasError,
            isDone: trustmarkAsyncStatus.isDone,
            icon: "car",
          }
        : undefined,
      credentials.EuropeanDisabilityCard
        ? {
            title: "Get Trustmark (DC)",
            onPress: () =>
              dispatch(
                getTrustmarkThunk({
                  credentialType: "EuropeanDisabilityCard",
                  documentNumber: getCredentialDocumentNumber(
                    credentials.EuropeanDisabilityCard
                  ),
                })
              ),
            isLoading: trustmarkAsyncStatus.isLoading,
            hasError: trustmarkAsyncStatus.hasError,
            isDone: trustmarkAsyncStatus.isDone,
            icon: "accessibility",
          }
        : undefined,
      credentials.EuropeanHealthInsuranceCard
        ? {
            title: "Get Trustmark (TS)",
            onPress: () =>
              dispatch(
                getTrustmarkThunk({
                  credentialType: "EuropeanHealthInsuranceCard",
                })
              ),
            isLoading: trustmarkAsyncStatus.isLoading,
            hasError: trustmarkAsyncStatus.hasError,
            isDone: trustmarkAsyncStatus.isDone,
            icon: "healthCard",
          }
        : undefined,
    ],
    [dispatch, credentials, trustmarkAsyncStatus]
  );

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.list}
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
                  onPress={item.onPress}
                  title={item.title}
                  isLoading={item.isLoading}
                  hasError={item.hasError}
                  isDone={item.isDone}
                  icon={item.icon}
                  isPresent={item.isPresent}
                />
                <VSpacer />
              </>
            )}
          </>
        )}
      />
      {trustmarkJwt && <TrustmarkQrCode trustmarkJwt={trustmarkJwt} />}
    </View>
  );
};

const TrustmarkQrCode = ({ trustmarkJwt }: { trustmarkJwt: string }) => {
  const selectedEnv = useAppSelector(selectEnv);
  const { VERIFIER_BASE_URL } = getEnv(selectedEnv);

  const trustmarkUrl = `${VERIFIER_BASE_URL}\\${trustmarkJwt}`;

  return (
    <View style={styles.trustmarkContainer}>
      <QrCodeImage value={trustmarkUrl} size={"90%"} />
      <ExpirationTimer time={120} />
    </View>
  );
};

const ExpirationTimer = ({ time }: { time: number }) => {
  const [timeLeft, setTimeLeft] = React.useState(time);

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
    <H3 color="red">Expired</H3>;
  }

  return (
    <H3>
      {`Expires in: ${Math.floor(timeLeft / 60)}:${(timeLeft % 60)
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
    flex: 1,
    flexGrow: 2,
    alignContent: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: IOVisualCostants.appMarginDefault,
  },
});
