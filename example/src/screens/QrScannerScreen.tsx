import React, { useEffect, useRef, useState } from "react";
import { Text, View, Alert, StyleSheet } from "react-native";
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from "react-native-vision-camera";
import { useAppDispatch } from "../store/utils";
import { useNavigation } from "@react-navigation/native";
// Thunk or action you want to dispatch
import { remoteCrossDevicePresentationThunk } from "../thunks/presentation";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { MainStackNavParamList } from "../navigator/MainStackNavigator";
import type { PresentationStateKeys } from "../store/reducers/presentation";

export type QrScannerScreenParams = {
  presentationBehavior: PresentationStateKeys;
};

type Props = NativeStackScreenProps<MainStackNavParamList, "QrScanner">;

export const QrScannerScreen = ({ route }: Props) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();
  const [hasPermission, setHasPermission] = useState(false);
  const hasScanned = useRef(false);
  const [isActive, setIsActive] = useState(true);

  const device = useCameraDevice("back");

  const presentationBehavior = route.params.presentationBehavior;

  // 3. Ask for camera permission on mount
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

  const codeScanner = useCodeScanner({
    codeTypes: ["qr", "ean-13"],
    onCodeScanned: (codes) => {
      setIsActive(false);
      if (hasScanned.current) {
        // This guards from multiple scans
        return;
      }
      hasScanned.current = true;
      dispatch(
        remoteCrossDevicePresentationThunk({
          qrcode: codes[0]?.value || "",
          allowed: presentationBehavior,
        })
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
      {hasPermission ? (
        <Camera
          style={style.camera}
          device={device}
          isActive={isActive}
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
  camera: {
    width: 500,
    height: 500,
  },
});
