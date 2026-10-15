import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { IconButtonSolid, IOColors } from "@pagopa/io-app-design-system";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import {
  Camera,
  type Code,
  useCameraDevice,
  useCodeScanner,
} from "react-native-vision-camera";

import type { MainStackNavParamList } from "../navigator/MainStackNavigator";
import type { PresentationStateKeys } from "../store/reducers/presentation";

import { useAppDispatch } from "../store/utils";
import { resolveEudiCredentialOfferThunk } from "../thunks/eudi/offer";
import { startEudiPresentationThunk } from "../thunks/eudi/presentation";
import { getCredentialOfferThunk } from "../thunks/offer";
import { remoteCrossDevicePresentationThunk } from "../thunks/presentation";

export type QrScannerScreenParams =
  | {
      mode: "eudiOffer";
    }
  | {
      mode: "eudiPresentation";
    }
  | {
      mode: "offer";
    }
  | {
      mode: "presentation";
      presentationBehavior: PresentationStateKeys;
    };

type Props = NativeStackScreenProps<MainStackNavParamList, "QrScanner">;

const hintByMode: Record<QrScannerScreenParams["mode"], string> = {
  eudiOffer: "Scan the credential offer QR code",
  eudiPresentation: "Scan the verifier QR code",
  offer: "Scan the credential offer QR code",
  presentation: "Scan the verifier QR code",
};

export const QrScannerScreen = ({ route }: Props) => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation();

  const backCameraDevice = useCameraDevice("back");
  const [hasPermission, setHasPermission] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

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
        case "eudiOffer":
          dispatch(
            resolveEudiCredentialOfferThunk({
              uri: codes[0]?.value || "",
            }),
          );
          navigation.goBack();
          break;
        case "eudiPresentation":
          dispatch(
            startEudiPresentationThunk({
              uri: codes[0]?.value || "",
            }),
          );
          navigation.goBack();
          break;
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
    <View style={style.container}>
      {hasPermission ? (
        <>
          <Camera
            audio={false}
            codeScanner={codeScanner}
            device={backCameraDevice}
            isActive={!isResting}
            style={style.camera}
            torch={isTorchOn ? "on" : "off"}
          />
          <ScannerOverlay
            footer={
              backCameraDevice.hasTorch && (
                <IconButtonSolid
                  accessibilityLabel={
                    isTorchOn ? "Turn off flashlight" : "Turn on flashlight"
                  }
                  color="contrast"
                  icon={isTorchOn ? "lightFilled" : "light"}
                  onPress={() => setIsTorchOn((on) => !on)}
                />
              )
            }
            hint={hintByMode[route.params.mode]}
          />
        </>
      ) : (
        <Text>Camera permission not granted!</Text>
      )}
    </View>
  );
};

const FRAME_WIDTH_RATIO = 0.7;
const CORNER_SIZE = 32;
const CORNER_THICKNESS = 4;
const CORNER_RADIUS = 16;
const SCAN_LINE_HEIGHT = 3;

/**
 * Builds the SVG path of the four viewfinder corner brackets. The stroke is
 * inset by half its width so it stays inside the frame, and the arc radius is
 * reduced accordingly so the outer edge follows the mask hole radius.
 */
const getCornerBracketsPath = (size: number) => {
  const h = CORNER_THICKNESS / 2;
  const r = CORNER_RADIUS - h;
  const s = CORNER_SIZE;
  const f = size;
  const arc = (x: number, y: number) => `A ${r} ${r} 0 0 1 ${x} ${y}`;
  return [
    `M ${h} ${s} V ${h + r} ${arc(h + r, h)} H ${s}`,
    `M ${f - s} ${h} H ${f - h - r} ${arc(f - h, h + r)} V ${s}`,
    `M ${f - h} ${f - s} V ${f - h - r} ${arc(f - h - r, f - h)} H ${f - s}`,
    `M ${s} ${f - h} H ${h + r} ${arc(h, f - h - r)} V ${f - s}`,
  ].join(" ");
};

type ScannerOverlayProps = {
  footer?: React.ReactNode;
  hint: string;
};

/**
 * Dims the camera preview outside a square viewfinder, which shows corner
 * brackets, a sweeping scan line and a subtle pulse to guide the user.
 */
const ScannerOverlay = ({ footer, hint }: ScannerOverlayProps) => {
  const { height, width } = useWindowDimensions();
  const frameSize = Math.round(width * FRAME_WIDTH_RATIO);
  const maskThickness = Math.max(height, width);

  const scanProgress = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    scanProgress.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.96, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, [scanProgress, pulse]);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: scanProgress.value * (frameSize - SCAN_LINE_HEIGHT * 8) },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={[StyleSheet.absoluteFill, style.overlay]}
    >
      <View style={style.overlayTop}>
        <Text style={style.hint}>{hint}</Text>
      </View>
      <View style={{ height: frameSize, width: frameSize }}>
        {/* A thick rounded border around the viewfinder dims the rest of the
            preview, leaving a hole whose corners match the brackets */}
        <View
          style={[
            style.mask,
            {
              borderRadius: maskThickness + CORNER_RADIUS,
              borderWidth: maskThickness,
              height: frameSize + maskThickness * 2,
              left: -maskThickness,
              top: -maskThickness,
              width: frameSize + maskThickness * 2,
            },
          ]}
        />
        <Animated.View style={[StyleSheet.absoluteFill, pulseStyle]}>
          <Svg height={frameSize} width={frameSize}>
            <Path
              d={getCornerBracketsPath(frameSize)}
              fill="none"
              stroke={IOColors.white}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={CORNER_THICKNESS}
            />
          </Svg>
          <Animated.View style={[style.scanLine, scanLineStyle]} />
        </Animated.View>
      </View>
      <View pointerEvents="box-none" style={style.overlayBottom}>
        <View>{footer}</View>
      </View>
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
  hint: {
    color: IOColors.white,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 32,
    paddingHorizontal: 24,
    textAlign: "center",
  },
  mask: {
    borderColor: "rgba(0, 0, 0, 0.6)",
    position: "absolute",
  },
  overlay: {
    alignItems: "center",
    overflow: "hidden",
  },
  overlayBottom: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  overlayTop: {
    flex: 1,
    justifyContent: "flex-end",
    // Keeps the hint above the mask, which is rendered later in the tree
    zIndex: 1,
  },
  scanLine: {
    backgroundColor: IOColors["blueIO-200"],
    borderRadius: SCAN_LINE_HEIGHT,
    elevation: 4,
    height: SCAN_LINE_HEIGHT,
    left: CORNER_SIZE / 2,
    position: "absolute",
    right: CORNER_SIZE / 2,
    shadowColor: IOColors["blueIO-200"],
    shadowOpacity: 0.9,
    shadowRadius: 8,
    top: SCAN_LINE_HEIGHT * 4,
  },
});
