import type { ImageSourcePropType } from "react-native";

import { SPID_DEMO_IDPHINT } from "./environment";

export interface Idp {
  id: string;
  localLogo: ImageSourcePropType;
  name: string;
  profileUrl: string;
}

export type IdpList = readonly Idp[];

/**
 * List of Identity Providers for SPID which will be used in the login screen.
 */
export const idps: IdpList = [
  {
    id: "arubaid",
    localLogo: require("../img/spid-idp-arubaid.png"),
    name: "Aruba ID",
    profileUrl: "https://selfcarespid.aruba.it",
  },
  {
    id: "ehtid",
    localLogo: require("../img/spid-idp-etnaid.png"),
    name: "Etna ID",
    profileUrl: "https://etnaid.eht.eu/",
  },
  {
    id: "infocamereid",
    localLogo: require("../img/spid-idp-infocamereid.png"),
    name: "ID InfoCamere",
    profileUrl: "https://selfcarespid.infocamere.it/spid-selfCare/#/login",
  },
  {
    id: "infocertid",
    localLogo: require("../img/spid-idp-infocertid.png"),
    name: "InfoCert ID",
    profileUrl: "https://my.infocert.it/selfcare",
  },
  {
    id: "intesiid",
    localLogo: require("../img/spid-idp-intesigroupspid.png"),
    name: "Intesi Group SPID",
    profileUrl: "https://spid.intesigroup.com",
  },
  {
    id: "lepidaid",
    localLogo: require("../img/spid-idp-lepidaid.png"),
    name: "Lepida ID",
    profileUrl: "https://id.lepida.it/",
  },
  {
    id: "namirialid",
    localLogo: require("../img/spid-idp-namirialid.png"),
    name: "Namirial ID",
    profileUrl: "https://idp.namirialtsp.com/idp",
  },
  {
    id: "posteid",
    localLogo: require("../img/spid-idp-posteid.png"),
    name: "Poste ID",
    profileUrl: "https://posteid.poste.it/private/cruscotto.shtml",
  },
  {
    id: "sielteid",
    localLogo: require("../img/spid-idp-sielteid.png"),
    name: "Sielte ID",
    profileUrl: "https://myid.sieltecloud.it/profile/",
  },
  {
    id: "spiditalia",
    localLogo: require("../img/spid-idp-spiditalia.png"),
    name: "SpidItalia",
    profileUrl: "https://spid.register.it",
  },
  {
    id: "timid",
    localLogo: require("../img/spid-idp-timid.png"),
    name: "TIM id",
    profileUrl: "https://id.tim.it/identity/private/",
  },
  {
    id: "teamsystemid",
    localLogo: require("../img/spid-idp-teamsystemid.png"),
    name: "TeamSystem ID",
    profileUrl: "https://identity.teamsystem.com/",
  },
];

export const testIdps: IdpList = [
  {
    id: "spiddemo",
    localLogo: require("../img/spid.png"),
    name: "SPID Demo",
    profileUrl: SPID_DEMO_IDPHINT,
  },
];

/**
 * Object of the SPID IDP IDs and the corresponding production hint URLs.
 */
const SPID_IDP_HINTS: Record<string, string> = {
  arubaid: "https://loginspid.aruba.it",
  ehtid: "https://id.eht.eu",
  infocamereid: "https://loginspid.infocamere.it",
  infocertid: "https://identity.infocert.it",
  intesiid: "https://idp.intesigroup.com",
  lepidaid: "https://id.lepida.it/idp/shibboleth",
  namirialid: "https://idp.namirialtsp.com/idp",
  posteid: "https://posteid.poste.it",
  sielteid: "https://identity.sieltecloud.it",
  spiddemo: SPID_DEMO_IDPHINT,
  spiditalia: "https://spid.register.it",
  teamsystemid: "https://spid.teamsystem.com/idp",
  timid: "https://login.id.tim.it/affwebservices/public/saml2sso",
};

/**
 * Map of the SPID IDP IDs and the corresponding production hint URLs.
 * If the IDP ID is not present in the map an error is thrown.
 * @param spidIdpId
 * @throws {@link Error} if the IDP ID is not present in the map
 * @returns
 */
export const getSpidIdpHint = (spidIdpId: string) => SPID_IDP_HINTS[spidIdpId];
