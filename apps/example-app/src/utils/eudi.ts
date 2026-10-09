import { IOColors } from "@pagopa/io-app-design-system";

/**
 * Configuration of the EUDI Wallet flows, separate from the IT-Wallet one.
 */

/** URI schemes of the EUDI Credential Offers: the OpenID4VCI default one, the EU EAA one and the HAIP one */
export const EUDI_CREDENTIAL_OFFER_SCHEMES = [
  "openid-credential-offer:",
  "eu-eaa-offer:",
  "haip-vci:",
];

/** Client identifier used when the wallet authenticates as a public client */
export const EUDI_CLIENT_ID = "io-wallet-example";

/** Redirect URI of the Authorization Code Flow, on a scheme already registered by the app */
export const EUDI_REDIRECT_URI = "iowalletexample://eudi/authorization";

/** Key bound to the access tokens with DPoP */
export const EUDI_DPOP_KEYTAG = "EUDI_DPOP_KEYTAG";

/** Human readable label of a credential format */
export const getFormatLabel = (format: string) =>
  ({ "dc+sd-jwt": "SD-JWT VC", mso_mdoc: "mdoc", "vc+sd-jwt": "SD-JWT VC" })[
    format
  ] ?? format;

/** Colors of a credential type, a darker shade for mdoc and a lighter one for SD-JWT VC */
interface CredentialTypeColors {
  mdoc: string;
  sdJwt: string;
  text: string;
}

/**
 * Colors of the EU credential types, inspired by their physical counterparts and the EU identity.
 * Each type is recognized by the tokens of its credential configuration id, e.g. `eu.europa.ec.eudi.pid_mdoc`.
 */
const EU_CREDENTIAL_TYPES: {
  colors: CredentialTypeColors;
  tokens: string[];
}[] = [
  {
    // EU flag blue
    colors: { mdoc: "#003399", sdJwt: "#2A56C6", text: "#FFFFFF" },
    tokens: ["pid", "personidentificationdata"],
  },
  {
    // Pink of the EU driving licence card
    colors: { mdoc: "#E8A0B4", sdJwt: "#F6C9D6", text: "#3B1B28" },
    tokens: ["mdl", "drivinglicense", "drivinglicence"],
  },
  {
    // Blue of the European Health Insurance Card, lighter than the PID one
    colors: { mdoc: "#0B5FA5", sdJwt: "#3D8ACB", text: "#FFFFFF" },
    tokens: ["ehic", "healthinsurancecard"],
  },
  {
    // Burgundy of the EU passports
    colors: { mdoc: "#6D1A36", sdJwt: "#8E2E50", text: "#FFFFFF" },
    tokens: ["photoid", "passport"],
  },
  {
    // Yellow of the EU flag stars
    colors: { mdoc: "#F2B800", sdJwt: "#FFD54A", text: "#1A1A1A" },
    tokens: ["av", "age", "ageverification", "ageoverx"],
  },
  {
    // Green of the social security documents, as the Portable Document A1
    colors: { mdoc: "#2F6B4F", sdJwt: "#4D8E6D", text: "#FFFFFF" },
    tokens: ["pda1", "portabledocumenta1"],
  },
  {
    // Teal of the health documents
    colors: { mdoc: "#00695C", sdJwt: "#2B8F82", text: "#FFFFFF" },
    tokens: ["hiid", "healthid"],
  },
  {
    // Slate of the bank cards
    colors: { mdoc: "#24394F", sdJwt: "#43607F", text: "#FFFFFF" },
    tokens: ["iban"],
  },
  {
    colors: { mdoc: "#4F347E", sdJwt: "#7254A8", text: "#FFFFFF" },
    tokens: ["tax", "taxid"],
  },
  {
    colors: { mdoc: "#7A4E0A", sdJwt: "#A06A1E", text: "#FFFFFF" },
    tokens: ["cor", "residence", "certificateofresidence"],
  },
];

/** Tokens of the credential configuration ids that refer to the format or namespace rather than the type */
const NON_TYPE_TOKENS = [
  "dc",
  "ec",
  "eu",
  "eudi",
  "europa",
  "iso",
  "jwt",
  "mdoc",
  "mso",
  "org",
  "sd",
  "sdjwt",
  "vc",
];

/** Splits a credential configuration id into lowercase tokens, e.g. `dc_sd_jwt_PersonIdentificationData` into `dc`, `sd`, `jwt` and `personidentificationdata` */
const getTypeTokens = (credentialConfigurationId: string) =>
  credentialConfigurationId
    .toLowerCase()
    .split(/[^a-z\d]+/)
    .filter(
      (token) =>
        token && !/^\d+$/.test(token) && !NON_TYPE_TOKENS.includes(token),
    );

const findEuType = (tokens: string[]) =>
  EU_CREDENTIAL_TYPES.find((type) =>
    type.tokens.some((token) => tokens.includes(token)),
  );

/**
 * 32-bit FNV-1a hash of a string, to generate the same color for the same credential type.
 * Bitwise operations are part of the algorithm.
 */
const fnv1a = (value: string) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    // eslint-disable-next-line no-bitwise
    hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193);
  }
  // eslint-disable-next-line no-bitwise
  return hash >>> 0;
};

/** Converts an HSL color, with saturation and lightness in [0, 1], to `#rrggbb` */
const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number) => {
    const k = (n + hue / 30) % 12;
    const value = lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
};

/** Relative luminance of a `#rgb` or `#rrggbb` color, undefined for other color formats */
const getLuminance = (color: string) => {
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color)?.[1];
  if (!hex) {
    return undefined;
  }
  const full =
    hex.length === 3 ? [...hex].map((char) => char + char).join("") : hex;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(full.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Black or white, whichever has the best contrast on the background */
const getContrastText = (backgroundColor: string) => {
  const luminance = getLuminance(backgroundColor);
  return luminance !== undefined && luminance > 0.179
    ? IOColors.black
    : IOColors.white;
};

/**
 * Colors of a credential card, from its type and format:
 * - EU credential types (PID, mDL, EHIC, ...) get the colors of their physical counterparts;
 * - other types get the colors defined by the issuer, when available;
 * - otherwise a color is generated from the type with FNV-1a, so that each type gets its own hue,
 *   always readable with white text.
 *
 * The format picks the shade of the type color: darker for mdoc, lighter for SD-JWT VC.
 */
export const getCredentialColors = ({
  credentialConfigurationId,
  display,
  format,
}: {
  credentialConfigurationId: string;
  display?: { backgroundColor?: string; textColor?: string };
  format: string;
}) => {
  const isMdoc = format === "mso_mdoc";
  const tokens = getTypeTokens(credentialConfigurationId);
  const euType = findEuType(tokens);
  if (euType) {
    return {
      backgroundColor: isMdoc ? euType.colors.mdoc : euType.colors.sdJwt,
      textColor: euType.colors.text,
    };
  }
  if (display?.backgroundColor) {
    return {
      backgroundColor: display.backgroundColor,
      textColor: display.textColor ?? getContrastText(display.backgroundColor),
    };
  }
  // The SD-JWT VC shade is darkened until white text is readable, e.g. for yellow hues
  const hue = fnv1a(tokens.join(".")) % 360;
  let lightness = 0.42;
  while ((getLuminance(hslToHex(hue, 0.55, lightness)) ?? 0) > 0.179) {
    lightness -= 0.02;
  }
  return {
    backgroundColor: hslToHex(hue, 0.55, isMdoc ? lightness - 0.1 : lightness),
    textColor: IOColors.white,
  };
};

/** Tag of the shared element transition of an obtained credential card, from the list to the detail */
export const getCredentialTransitionTag = (keyTag: string) =>
  `eudi-credential-${keyTag}`;

/** Adds an opacity to a `#rrggbb` color, other color formats are returned transparent */
export const withOpacity = (color: string, opacity: number) => {
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(color);
  if (!hex) {
    return "transparent";
  }
  const [r, g, b] = hex.slice(1).map((channel) => parseInt(channel, 16));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};
