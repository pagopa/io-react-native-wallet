import {
  AllowedState,
  type DigitalCredential,
} from "../api/DigitalCredentialsCatalogue";

/**
 * Given a statusBit (e.g. "0x00", "0x0B") and a DigitalCredential from the
 * catalogue, returns the matching l10n IDs or undefined if not found.
 * The comparison is case-insensitive to handle uppercase statusBit values
 * returned by verifyAndParseStatusList against lowercase keys in the catalogue.
 */
export const getStatusL10nIds = (
  statusBit: string,
  credentialConfig: DigitalCredential
): { titleL10nId: string; descriptionL10nId: string } | undefined => {
  const normalizedBit = statusBit.toLowerCase();
  const match = credentialConfig.validity_info.allowed_states.find(
    (s): s is AllowedState =>
      typeof s === "object" &&
      Object.keys(s).some((k) => k.toLowerCase() === normalizedBit)
  );
  if (!match) return undefined;
  return {
    titleL10nId: match.title_l10n_id,
    descriptionL10nId: match.description_l10n_id,
  };
};
