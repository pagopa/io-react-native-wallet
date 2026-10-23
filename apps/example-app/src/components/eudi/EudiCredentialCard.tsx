import { IOColors, IOText } from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import type { EudiCredential } from "../../store/reducers/eudi/credentials";

import {
  type getCardStatus,
  getCredentialColors,
  getFormatLabel,
  withOpacity,
} from "../../utils/eudi";

/** Width to height ratio of the card, as the ID-1 format of physical identity documents */
const CARD_ASPECT_RATIO = 1.586;

/** Colors of the validity status dot, by status badge variant */
const STATUS_COLORS = {
  error: IOColors["error-500"],
  success: IOColors["success-500"],
  warning: IOColors["warning-500"],
};

const CARD_BORDER_RADIUS = 16;

type LogoStatus = "error" | "loaded";

/**
 * Load results of the issuer logos, so that every card showing a logo, e.g. the one of the next
 * screen, has the same layout from its first frame.
 */
const logoStatuses = new Map<string, LogoStatus>();

type Props = {
  credential: Partial<Pick<EudiCredential, "keyTag" | "obtainedAt">> &
    Pick<
      EudiCredential,
      "credentialConfigurationId" | "display" | "format" | "issuer"
    >;
  /** Holder picture, shown as on the physical documents */
  portrait?: { label: string; uri: string };
  /** Validity status of the credential, see {@link getCardStatus} */
  status?: ReturnType<typeof getCardStatus>;
};

/**
 * Card showing an EUDI Wallet credential, obtained or offered, with the colors and logo defined by its issuer.
 * Its colors come from the credential type and format, see {@link getCredentialColors}.
 * A diagonal highlight and shade are drawn directly on the card surface.
 */
export const EudiCredentialCard = ({ credential, portrait, status }: Props) => {
  const { credentialConfigurationId, display, issuer, obtainedAt } = credential;
  const name = display?.name ?? credentialConfigurationId;
  const logoUri = display?.logoUri;
  const [logoStatus, setLogoStatus] = useState(() =>
    logoUri ? logoStatuses.get(logoUri) : undefined,
  );
  const onLogoStatus = (status: LogoStatus) => {
    if (logoUri) logoStatuses.set(logoUri, status);
    setLogoStatus(status);
  };
  const { backgroundColor, textColor } = getCredentialColors(credential);
  // IOText applies a custom color only through the style prop
  const textStyle = { color: textColor };
  const pillStyle = [
    styles.pill,
    {
      backgroundColor: withOpacity(textColor, 0.1),
      borderColor: withOpacity(textColor, 0.18),
    },
  ];

  return (
    <View
      style={[
        styles.card,
        { backgroundColor, borderColor: withOpacity(textColor, 0.14) },
      ]}
    >
      <View style={styles.header}>
        {portrait && (
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={portrait.label}
            resizeMode="cover"
            source={{ uri: portrait.uri }}
            style={styles.portrait}
          />
        )}
        <View style={styles.title}>
          <IOText numberOfLines={2} size={20} style={textStyle} weight="Bold">
            {name}
          </IOText>
          <IOText
            numberOfLines={1}
            size={14}
            style={{ ...textStyle, ...styles.issuer }}
            weight="Regular"
          >
            {display?.issuerName ?? issuer}
          </IOText>
        </View>
        {logoUri && logoStatus !== "error" && (
          <View
            style={[
              styles.logoContainer,
              logoStatus === "loaded" && styles.logoLoaded,
            ]}
          >
            <Image
              accessibilityIgnoresInvertColors
              onError={() => onLogoStatus("error")}
              onLoad={() => onLogoStatus("loaded")}
              resizeMode="contain"
              source={{ uri: logoUri }}
              style={styles.logo}
            />
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <View style={styles.pills}>
          <View style={pillStyle}>
            <IOText size={12} style={textStyle} weight="Semibold">
              {getFormatLabel(credential.format)}
            </IOText>
          </View>
          {status && (
            <View style={[pillStyle, styles.statusPill]}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: STATUS_COLORS[status.variant] },
                ]}
              />
              <IOText size={12} style={textStyle} weight="Semibold">
                {status.label}
              </IOText>
            </View>
          )}
        </View>
        {obtainedAt && (
          <View style={styles.date}>
            <IOText
              size={10}
              style={{ ...textStyle, ...styles.dateLabel }}
              weight="Semibold"
            >
              ADDED TO WALLET
            </IOText>
            <IOText size={12} style={textStyle} weight="Semibold">
              {new Date(obtainedAt).toLocaleDateString()}
            </IOText>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: CARD_BORDER_RADIUS,
    borderWidth: 1,
    experimental_backgroundImage:
      "linear-gradient(125deg, rgba(255, 255, 255, 0.24) 0%, rgba(255, 255, 255, 0.06) 38%, rgba(0, 0, 0, 0.04) 65%, rgba(0, 0, 0, 0.22) 100%)",
    justifyContent: "space-between",
    overflow: "hidden",
    padding: 16,
  },
  date: {
    alignItems: "flex-end",
    gap: 2,
  },
  dateLabel: {
    letterSpacing: 1,
    opacity: 0.7,
  },
  footer: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  issuer: {
    opacity: 0.8,
  },
  logo: {
    height: 36,
    width: 36,
  },
  logoContainer: {
    alignItems: "center",
    borderRadius: 12,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  // The white background is shown only for a loaded logo, to avoid an empty tile
  logoLoaded: {
    backgroundColor: "white",
  },
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pills: {
    flexDirection: "row",
    flexShrink: 1,
    flexWrap: "wrap",
    gap: 6,
  },
  portrait: {
    aspectRatio: 3 / 4,
    borderRadius: 8,
    width: 60,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  statusPill: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  title: {
    flex: 1,
    gap: 4,
  },
});
