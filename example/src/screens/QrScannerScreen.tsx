import React, { useEffect } from "react";
import { Text, View, Alert } from "react-native";
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from "react-native-vision-camera";
import { useAppDispatch } from "../store/utils";
import { useNavigation } from "@react-navigation/native";
// Thunk or action you want to dispatch
import { remoteCrossDevicePresentationThunk } from "../thunks/presentation";

export const QrScannerScreen = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const device = useCameraDevice("back");

  // 3. Ask for camera permission on mount
  useEffect(() => {
    (async () => {
      const cameraPermission = await Camera.requestCameraPermission();
      if (cameraPermission.toString() !== "granted") {
        Alert.alert("Error", "Camera permission not granted!");
      }
    })();
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ["qr", "ean-13"],
    onCodeScanned: (codes) => {
      dispatch(
        remoteCrossDevicePresentationThunk({ qrcode: codes[0]?.value || "" })
      );

      navigation.goBack();
    },
  });

  if (!device) {
    return (
      <View>
        <Text>Camera not available!</Text>
      </View>
    );
  }

  return (
    <View>
      <Camera
        style={{ width: 500, height: 500 }}
        device={device}
        isActive={true} // optionally disable camera after scanning
        codeScanner={codeScanner}
        audio={false}
      />
    </View>
  );
};
