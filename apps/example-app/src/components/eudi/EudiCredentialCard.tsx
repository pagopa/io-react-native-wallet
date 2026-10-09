import { AnimatedIOText } from "@pagopa/io-app-design-system";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import type { EudiCredential } from "../../store/reducers/eudi/credentials";

import {
  getCredentialColors,
  getFormatLabel,
  withOpacity,
} from "../../utils/eudi";

/** Width to height ratio of the card */
const CARD_ASPECT_RATIO = 1.75;

const CARD_BORDER_RADIUS = 16;

type LogoStatus = "error" | "loaded";

/**
 * Load results of the issuer logos, so that every card showing a logo, e.g. the moving one of the
 * transition between screens, has the same layout from its first frame.
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
  /** Tag of the shared element transition between the screens showing the same credential */
  sharedTransitionTag?: string;
};

/**
 * Card showing an EUDI Wallet credential, obtained or offered, with the colors and logo defined by its issuer.
 * Its colors come from the credential type and format, see {@link getCredentialColors}.
 * A diagonal highlight and shade are drawn directly on the card surface.
 *
 * With `sharedTransitionTag`, the card moves between screens with a shared element transition.
 * Reanimated moves a copy of each tagged view without its children, so the background and every
 * content element are tagged on their own. The gradients belong to the card's native background
 * and are copied with it, avoiding separate image loads at the start of the transition.
 */
export const EudiCredentialCard = ({
  credential,
  portrait,
  sharedTransitionTag,
}: Props) => {
  const tag = (element?: string) =>
    sharedTransitionTag &&
    (element ? `${sharedTransitionTag}:${element}` : sharedTransitionTag);
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

  return (
    <Animated.View
      sharedTransitionTag={tag()}
      style={[
        styles.card,
        { backgroundColor, borderColor: withOpacity(textColor, 0.14) },
      ]}
    >
      <View style={styles.header}>
        {portrait && (
          <Animated.Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={portrait.label}
            resizeMode="cover"
            sharedTransitionTag={tag("portrait")}
            source={{ uri: portrait.uri }}
            style={styles.portrait}
          />
        )}
        <View style={styles.title}>
          <AnimatedIOText
            numberOfLines={2}
            sharedTransitionTag={tag("name")}
            size={20}
            style={textStyle}
            weight="Bold"
          >
            {name}
          </AnimatedIOText>
          <AnimatedIOText
            numberOfLines={1}
            sharedTransitionTag={tag("issuer")}
            size={14}
            style={[textStyle, styles.issuer]}
            weight="Regular"
          >
            {display?.issuerName ?? issuer}
          </AnimatedIOText>
        </View>
        {logoUri && logoStatus !== "error" && (
          <Animated.View
            sharedTransitionTag={tag("logoContainer")}
            style={[
              styles.logoContainer,
              logoStatus === "loaded" && styles.logoLoaded,
            ]}
          >
            <Animated.Image
              accessibilityIgnoresInvertColors
              onError={() => onLogoStatus("error")}
              onLoad={() => onLogoStatus("loaded")}
              resizeMode="contain"
              sharedTransitionTag={tag("logo")}
              source={{ uri: logoUri }}
              style={styles.logo}
            />
          </Animated.View>
        )}
      </View>
      <View style={styles.footer}>
        <Animated.View
          sharedTransitionTag={tag("format")}
          // A background color rather than a translucent layer, since the copy has no children
          style={[
            styles.pill,
            {
              backgroundColor: withOpacity(textColor, 0.1),
              borderColor: withOpacity(textColor, 0.18),
            },
          ]}
        >
          <AnimatedIOText
            sharedTransitionTag={tag("formatLabel")}
            size={12}
            style={textStyle}
            weight="Semibold"
          >
            {getFormatLabel(credential.format)}
          </AnimatedIOText>
        </Animated.View>
        {obtainedAt && (
          <View style={styles.date}>
            <AnimatedIOText
              sharedTransitionTag={tag("obtainedAtLabel")}
              size={10}
              style={[textStyle, styles.dateLabel]}
              weight="Semibold"
            >
              ADDED TO WALLET
            </AnimatedIOText>
            <AnimatedIOText
              sharedTransitionTag={tag("obtainedAt")}
              size={12}
              style={textStyle}
              weight="Semibold"
            >
              {new Date(obtainedAt).toLocaleDateString()}
            </AnimatedIOText>
          </View>
        )}
      </View>
    </Animated.View>
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
  portrait: {
    aspectRatio: 3 / 4,
    borderRadius: 8,
    width: 60,
  },
  title: {
    flex: 1,
    gap: 4,
  },
});
