import { IOColors, IOText, VSpacer } from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import type { EudiCredential } from "../../store/reducers/eudi/credentials";

import { getFormatLabel } from "../../utils/eudi";

type Props = {
  credential: Pick<
    EudiCredential,
    "credentialConfigurationId" | "display" | "format" | "issuer"
  >;
};

/**
 * Card showing an EUDI Wallet credential, obtained or offered, with the colors and logo defined by its issuer.
 */
export const EudiCredentialCard = ({ credential }: Props) => {
  const { display } = credential;
  const [hasLogoError, setHasLogoError] = useState(false);
  // IOText applies a custom color only through the style prop
  const textStyle = { color: display?.textColor ?? IOColors.white };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: display?.backgroundColor ?? IOColors["blueIO-500"] },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.title}>
          <IOText size={20} style={textStyle} weight="Bold">
            {display?.name ?? credential.credentialConfigurationId}
          </IOText>
          <IOText size={14} style={textStyle} weight="Regular">
            {display?.issuerName ?? credential.issuer}
          </IOText>
        </View>
        {display?.logoUri && !hasLogoError && (
          <Image
            accessibilityIgnoresInvertColors
            onError={() => setHasLogoError(true)}
            resizeMode="contain"
            source={{ uri: display.logoUri }}
            style={styles.logo}
          />
        )}
      </View>
      <VSpacer size={24} />
      <IOText size={12} style={textStyle} weight="Semibold">
        {getFormatLabel(credential.format)}
      </IOText>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  logo: {
    height: 48,
    width: 48,
  },
  title: {
    flex: 1,
    gap: 4,
  },
});
