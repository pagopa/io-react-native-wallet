import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { IOColors } from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import {
  Camera,
  type Code,
  useCameraDevice,
  useCodeScanner,
} from "react-native-vision-camera";

import type { MainStackNavParamList } from "../navigator/MainStackNavigator";
import type { PresentationStateKeys } from "../store/reducers/presentation";

import { styles } from "../App";
import { useAppDispatch } from "../store/utils";
import { getCredentialOfferThunk } from "../thunks/offer";
import { remoteCrossDevicePresentationThunk } from "../thunks/presentation";

export type QrScannerScreenParams =
  | {
      mode: "offer";
    }
  | {
      mode: "presentation";
      presentationBehavior: PresentationStateKeys;
    };

type Props = NativeStackScreenProps<MainStackNavParamList, "QrScanner">;

export const QrScannerScreen = ({ route }: Props) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const backCameraDevice = useCameraDevice("back");
  const [hasPermission, setHasPermission] = useState(false);

  // This handles the resting state of the scanner after a scan
  // It is necessary to avoid multiple scans of the same barcode
  const scannerReactivateTimeoutHandler = useRef<NodeJS.Timeout>(undefined);
  const [isResting, setIsResting] = useState(false);

  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      if (cameraPermission.toString() === "granted") {
        setHasPermission(true);
      } else {
        Alert.alert("Error", "Camera permission not granted!");
      }
    })();
  }, []);

  const handleCodeScanned = useCallback(
    (codes: Code[]) => {
      if (isResting) {
        // Barcode scanner is disabled, skip
        return;
      }

      // After a scan (even if not successful) the camera is disabled for 1 second
      // to avoid multiple scans of the same barcode
      setIsResting(true);
      scannerReactivateTimeoutHandler.current = setTimeout(() => {
        setIsResting(false);
      }, 1000);

      switch (route.params.mode) {
        case "offer":
          dispatch(
            getCredentialOfferThunk({
              qrcode: codes[0]?.value || "",
            }),
          );
          navigation.goBack();
          break;
        case "presentation":
          dispatch(
            remoteCrossDevicePresentationThunk({
              allowed: route.params.presentationBehavior,
              qrcode: codes[0]?.value || "",
            }),
          );
          navigation.goBack();
          break;
      }
    },
    [isResting, dispatch, navigation, route.params],
  );

  /**
   * Hook that clears the timeout handler on unmount
   */
  useEffect(
    () => () => {
      clearTimeout(scannerReactivateTimeoutHandler.current);
    },
    [scannerReactivateTimeoutHandler],
  );

  const codeScanner = useCodeScanner({
    codeTypes: ["qr", "ean-13"],
    onCodeScanned: handleCodeScanned,
  });

  if (!backCameraDevice) {
    return (
      <View>
        <Text>Camera not available!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasPermission ? (
        <Camera
          audio={false}
          codeScanner={codeScanner}
          device={backCameraDevice}
          isActive={!isResting}
          style={style.camera}
        />
      ) : (
        <Text>Camera permission not granted!</Text>
      )}
    </View>
  );
};

const style = StyleSheet.create({
  camera: {
    backgroundColor: IOColors.black,
    height: "100%",
    position: "relative",
    width: "100%",
  },
  container: {
    alignContent: "center",
    flex: 1,
    justifyContent: "center",
  },
});
