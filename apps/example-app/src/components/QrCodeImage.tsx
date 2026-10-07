import React from "react";
import { useWindowDimensions } from "react-native";
import QRCode, { type QRCodeProps } from "react-native-qrcode-svg";
import Placeholder from "rn-placeholder";

export interface QrCodeImageProps {
  // Optional background color for the QR Code image
  backgroundColor?: string;
  // Optional correction level for the QR Code image
  correctionLevel?: QRCodeProps["ecl"];
  // Relative or absolute size of the QRCode image
  size?: `${number}%` | number;
  // Value to decode and present using a QR Code
  // If undefined, a placeholder is shown
  value?: string;
}

/**
 * This components renders a QR Code which resolves in the provided value
 */
const QrCodeImage = ({
  backgroundColor,
  correctionLevel = "H",
  size = 200,
  value,
}: QrCodeImageProps) => {
  const { width } = useWindowDimensions();
  const realSize = React.useMemo<number>(() => {
    if (typeof size === "number") {
      return size;
    }

    return (parseFloat(size) / 100.0) * width;
  }, [size, width]);

  return value ? (
    <QRCode
      backgroundColor={backgroundColor}
      ecl={correctionLevel}
      size={realSize}
      value={value}
    />
  ) : (
    <Placeholder.Box
      animate="fade"
      height={realSize}
      radius={16}
      width={realSize}
    />
  );
};

const MemoizedQrCodeImage = React.memo(QrCodeImage);

export { MemoizedQrCodeImage as QrCodeImage };
