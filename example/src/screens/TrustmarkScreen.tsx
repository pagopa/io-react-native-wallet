import { H3, IOVisualCostants, VSpacer } from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { QrCodeImage } from "../components/QrCodeImage";
import TestScenario, {
  type TestScenarioProp,
} from "../components/TestScenario";
import { useDebugInfo } from "../hooks/useDebugInfo";
import type { MainStackNavParamList } from "../navigator/MainStackNavigator";
import {
  selectCredential,
  selectObtainedCredentials,
  selectTrustmark,
  selectTrustmarkAsyncStatus,
  trustmarkReset,
} from "../store/reducers/credential";
import { selectEnv } from "../store/reducers/environment";
import type { CredentialResult } from "../store/types";
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

  const scenarios: Array<TestScenarioProp | undefined> = useMemo(
    () =>
      Object.values(credentials)
        .filter((_) => !!_)
        .map(({ credentialType }) => ({
          title: `Get Trustmark (${labelByCredentialType[credentialType]})`,
          onPress: () =>
            navigation.navigate("TrustmarkQrCode", { credentialType }),
          isLoading: false,
          hasError: { status: false, error: undefined },
          isDone: false,
          icon: iconByCredentialType[credentialType],
        })),
    [navigation, credentials]
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
  const trustmark = useAppSelector(selectTrustmark(credentialType));
  const trustmarkAsyncStatus = useAppSelector(
    selectTrustmarkAsyncStatus(credentialType)
  );
  const credential = useAppSelector(selectCredential(credentialType));
  const selectedEnv = useAppSelector(selectEnv);
  const { VERIFIER_BASE_URL } = getEnv(selectedEnv);

  useDebugInfo({
    trustmarkJwt: trustmark?.trustmarkJwt,
    expirationTime: trustmark?.expirationTime,
    trustmarkAsyncStatus,
  });

  React.useEffect(() => {
    if (credential) {
      const documentNumber = getCredentialDocumentNumber(credential);
      dispatch(getTrustmarkThunk({ credentialType, documentNumber }));

      return () => {
        dispatch(trustmarkReset(credentialType));
      };
    }

    return undefined;
  }, [dispatch, credential, credentialType]);

  if (trustmark === undefined) {
    return null;
  }

  const { trustmarkJwt, expirationTime } = trustmark;
  const trustmarkUrl = `${VERIFIER_BASE_URL}?tm=${trustmarkJwt}`;

  return (
    <View style={styles.trustmarkContainer}>
      <QrCodeImage value={trustmarkUrl} size={"90%"} correctionLevel="L" />
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
  credential: CredentialResult | undefined
): string | undefined => {
  return credential?.parsedCredential.document_number?.value as string;
};

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
    flex: 1,
    flexGrow: 2,
    alignContent: "center",
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: IOVisualCostants.appMarginDefault,
  },
});
