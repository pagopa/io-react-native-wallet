import { IOColors } from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import {
  Camera,
  type Code,
  useCameraDevice,
  useCodeScanner,
} from "react-native-vision-camera";
import { styles } from "../App";
import type { MainStackNavParamList } from "../navigator/MainStackNavigator";
import type { PresentationStateKeys } from "../store/reducers/presentation";
import { useAppDispatch } from "../store/utils";
import { remoteCrossDevicePresentationThunk } from "../thunks/presentation";
import { getCredentialOfferRequestedParams } from "../thunks/offer";

export type QrScannerScreenParams =
  | {
      mode: "presentation";
      presentationBehavior: Exclude<
        PresentationStateKeys,
        "selectedCredentialIds"
      >;
    }
  | {
      mode: "offer";
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
  const isScanningRef = useRef(false);

  useEffect(() => {
    (async () => {
      let status = Camera.getCameraPermissionStatus();
      if (status !== "granted") {
        status = await Camera.requestCameraPermission();
      }

      if (status === "granted") {
        setHasPermission(true);
      } else {
        Alert.alert("Error", "Camera permission not granted!");
      }
    })();
  }, []);

  const handleCodeScanned = useCallback(
    (codes: Code[]) => {
      if (isScanningRef.current) {
        // Barcode scanner is disabled, skip
        return;
      }

      isScanningRef.current = true;

      // After a scan (even if not successful) the camera is disabled for 1 second
      // to avoid multiple scans of the same barcode
      setIsResting(true);
      scannerReactivateTimeoutHandler.current = setTimeout(() => {
        isScanningRef.current = false;
        setIsResting(false);
      }, 1000);

      switch (route.params.mode) {
        case "presentation":
          dispatch(
            remoteCrossDevicePresentationThunk({
              qrcode: codes[0]?.value || "",
              allowed: route.params.presentationBehavior,
            })
          );
          navigation.goBack();
          break;
        case "offer":
          dispatch(
            getCredentialOfferRequestedParams({
              qrcode: codes[0]?.value || "",
            })
          );
          navigation.goBack();
          break;
      }
    },
    [dispatch, navigation, route.params]
  );

  /**
   * Hook that clears the timeout handler on unmount
   */
  useEffect(
    () => () => {
      clearTimeout(scannerReactivateTimeoutHandler.current);
    },
    [scannerReactivateTimeoutHandler]
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
          style={style.camera}
          device={backCameraDevice}
          isActive={!isResting}
          codeScanner={codeScanner}
          audio={false}
        />
      ) : (
        <Text>Camera permission not granted!</Text>
      )}
    </View>
  );
};

const style = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: "center",
    justifyContent: "center",
  },
  camera: {
    position: "relative",
    width: "100%",
    height: "100%",
    backgroundColor: IOColors.black,
  },
});
