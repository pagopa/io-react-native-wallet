import React from "react";
import {
  Image,
  useWindowDimensions,
  type ImageSourcePropType,
} from "react-native";
import Placeholder from "rn-placeholder";
import RNQRGenerator from "rn-qr-generator";

export type QrCodeImageProps = {
  // Value to decode and present using a QR Code
  value: string;
  // Relative or absolute size of the QRCode image
  size?: number | `${number}%`;
  // Optional background color for the QR Code image
  backgroundColor?: string;
};

/**
 * This components renders a QR Code which resolves in the provided value
 */
const QrCodeImage = ({
  value,
  size = 200,
  backgroundColor,
}: QrCodeImageProps) => {
  const [source, setSource] = React.useState<ImageSourcePropType>();
  const { width } = useWindowDimensions();
  const realSize = React.useMemo<number>(() => {
    if (typeof size === "number") {
      return size;
    }

    return (parseFloat(size) / 100.0) * width;
  }, [size, width]);

  React.useEffect(() => {
    RNQRGenerator.generate({
      value,
      height: realSize,
      width: realSize,
      backgroundColor,
      correctionLevel: "L",
    })
      .then((result) => setSource(result))
      .catch((_) => undefined);
  }, [value, realSize, backgroundColor]);

  return source ? (
    <Image source={source} />
  ) : (
    <Placeholder.Box
      height={realSize}
      width={realSize}
      animate="fade"
      radius={16}
    />
  );
};

const MemoizedQrCodeImage = React.memo(QrCodeImage);

export { MemoizedQrCodeImage as QrCodeImage };
