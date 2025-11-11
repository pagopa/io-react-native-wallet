import { H2, LoadingSpinner } from "@pagopa/io-app-design-system";
import { CieManager, type NfcError } from "@pagopa/io-react-native-cie";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, SafeAreaView, StyleSheet, View } from "react-native";
import { CiePinDialog } from "../../components/cie/CiePinDialog";
import type { CieWebViewError } from "../../components/cie/CieWebView";
import type { MainStackNavParamList } from "../../navigator/MainStackNavigator";
import { pidFlowReset } from "../../store/reducers/pid";
import { useAppDispatch } from "../../store/utils";
import { validatePidMrtdChallengeThunk } from "../../thunks/mrtd";
import { getProgressEmojis } from "../../utils/strings";

type ScreenProps = NativeStackScreenProps<
  MainStackNavParamList,
  "CieInternalAuthentication"
>;

export const CieInternalAuthenticationScreen = ({
  route,
  navigation,
}: ScreenProps) => {
  const dispatch = useAppDispatch();
  const { challenge } = route.params;

  const [isLoading, setIsLoading] = useState(false);
  const [isCanInputVisible, setCanInputVisible] = useState(true);
  const [can, setCan] = useState("");
  const [text, setText] = useState<string>();

  const handleOnError = useCallback(
    (error: NfcError | CieWebViewError) => {
      navigation.goBack();
      dispatch(pidFlowReset());
      Alert.alert(`❌ Error`, `${JSON.stringify(error)}`);
    },
    [navigation, dispatch]
  );

  useEffect(() => {
    const cleanup = [
      // Start listening for NFC events
      CieManager.addListener("onEvent", (event) => {
        setText(
          "I'm reading the CIE. Do not remove it from the device\n" +
            getProgressEmojis(event.progress)
        );
      }),
      // Start listening for errors
      CieManager.addListener("onError", (error) => {
        handleOnError(error);
      }),
      // Start listening for success
      CieManager.addListener(
        "onInternalAuthAndMRTDWithPaceSuccess",
        ({ mrtd_data, nis_data }) => {
          console.log("CIE Internal Auth Success Data:", mrtd_data, nis_data);
          dispatch(
            validatePidMrtdChallengeThunk({
              mrtd: {
                dg1: mrtd_data.dg1,
                dg11: mrtd_data.dg11,
                sod_mrtd: mrtd_data.sod,
              },
              ias: {
                sod_ias: nis_data.sod,
                challenge_signed: nis_data.signedChallenge,
                ias_pk: nis_data.publicKey,
              },
            })
          );
          navigation.goBack();
        }
      ),
    ];

    return () => {
      // Remove the event listener on exit
      cleanup.forEach((remove) => remove());
      // Ensure the reading is stopped when component unmounts
      CieManager.stopReading();
    };
  }, [dispatch, navigation, handleOnError]);

  const handleCanConfirm = useCallback(() => {
    if (can && can.length === 6 && /^\d+$/.test(can)) {
      setCanInputVisible(false);
      setIsLoading(true);
      CieManager.startInternalAuthAndMRTDReading(can, challenge, "base64");
    } else {
      Alert.alert(`❌ Invalid CIE PIN`);
    }
  }, [can, challenge]);

  const handleCanClose = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView>
      <CiePinDialog
        type="CAN"
        visible={isCanInputVisible}
        onChangePin={setCan}
        onConfirm={handleCanConfirm}
        onCancel={handleCanClose}
      />
      {isLoading && (
        <View style={styles.progress}>
          <LoadingSpinner size={48} />
        </View>
      )}
      <View style={styles.content}>
        {text && <H2 style={styles.text}>{text}</H2>}
      </View>
    </SafeAreaView>
  );
};

export function encodeChallenge(challenge: string): string {
  // Convert string to UTF-8 bytes, then to base64
  if (typeof btoa === "function") {
    // The btoa function in JavaScript environments expects a "byte string",
    // where each character's code point is in the 0-255 range.
    // A direct call to btoa() on a string containing multi-byte Unicode characters
    // (like '€') will throw an "InvalidCharacterError".
    //
    // This encode/decode chain is a robust trick to solve this:
    // 1. `encodeURIComponent(challenge)`: Converts the string into its UTF-8
    //    percent-encoded representation (e.g., '€' becomes '%E2%82%AC').
    // 2. `decodeURIComponent(...)`: Reinterprets the percent-encoded sequences
    //    back into a string where each character's code point represents a single
    //    byte of the original UTF-8 sequence. This creates a "byte string"
    //    that is safe for btoa to consume.
    return btoa(decodeURIComponent(encodeURIComponent(challenge)));
  }
  // Fallback for environments without btoa
  throw new Error("Base64 encoding not supported in this environment");
}

const styles = StyleSheet.create({
  progress: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    height: "100%",
    alignItems: "center",
    alignContent: "center",
    gap: 16,
  },
  text: {
    marginTop: 64,
    marginHorizontal: 24,
    textAlign: "center",
    backgroundColor: "red",
  },
});
