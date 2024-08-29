import { CIE_UAT } from "@env";

/**
 * Flag to determine if the CIE UAT environment should be used.
 */
export const isCieUat = CIE_UAT === "true" || CIE_UAT === "1";

/**
 * IDPHINT for CIE when using the PROD environment of the identity provider.
 */
export const CIE_PROD_IDPHINT =
  "https://idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";

/**
 * IDPHINT for CIE when using the UAT environment of the identity provider.
 */
export const CIE_UAT_IDPHINT =
  "https://collaudo.idserver.servizicie.interno.gov.it/idp/profile/SAML2/POST/SSO";
