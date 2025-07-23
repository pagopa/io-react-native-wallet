import type { ImageSourcePropType } from "react-native";
import { SPID_DEMO_IDPHINT } from "./environment";

export type Idp = {
  id: string;
  name: string;
  profileUrl: string;
  localLogo: ImageSourcePropType;
};

export type IdpList = ReadonlyArray<Idp>;

/**
 * List of Identity Providers for SPID which will be used in the login screen.
 */
export const idps: IdpList = [
  {
    id: "arubaid",
    name: "Aruba ID",
    localLogo: require("../img/spid-idp-arubaid.png"),
    profileUrl: "https://selfcarespid.aruba.it",
  },
  {
    id: "ehtid",
    name: "Etna ID",
    localLogo: require("../img/spid-idp-etnaid.png"),
    profileUrl: "https://etnaid.eht.eu/",
  },
  {
    id: "infocamereid",
    name: "ID InfoCamere",
    localLogo: require("../img/spid-idp-infocamereid.png"),
    profileUrl: "https://selfcarespid.infocamere.it/spid-selfCare/#/login",
  },
  {
    id: "infocertid",
    name: "InfoCert ID",
    localLogo: require("../img/spid-idp-infocertid.png"),
    profileUrl: "https://my.infocert.it/selfcare",
  },
  {
    id: "intesiid",
    name: "Intesi Group SPID",
    localLogo: require("../img/spid-idp-intesigroupspid.png"),
    profileUrl: "https://spid.intesigroup.com",
  },
  {
    id: "lepidaid",
    name: "Lepida ID",
    localLogo: require("../img/spid-idp-lepidaid.png"),
    profileUrl: "https://id.lepida.it/",
  },
  {
    id: "namirialid",
    name: "Namirial ID",
    localLogo: require("../img/spid-idp-namirialid.png"),
    profileUrl: "https://idp.namirialtsp.com/idp",
  },
  {
    id: "posteid",
    name: "Poste ID",
    localLogo: require("../img/spid-idp-posteid.png"),
    profileUrl: "https://posteid.poste.it/private/cruscotto.shtml",
  },
  {
    id: "sielteid",
    name: "Sielte ID",
    localLogo: require("../img/spid-idp-sielteid.png"),
    profileUrl: "https://myid.sieltecloud.it/profile/",
  },
  {
    id: "spiditalia",
    name: "SpidItalia",
    localLogo: require("../img/spid-idp-spiditalia.png"),
    profileUrl: "https://spid.register.it",
  },
  {
    id: "timid",
    name: "TIM id",
    localLogo: require("../img/spid-idp-timid.png"),
    profileUrl: "https://id.tim.it/identity/private/",
  },
  {
    id: "teamsystemid",
    name: "TeamSystem ID",
    localLogo: require("../img/spid-idp-teamsystemid.png"),
    profileUrl: "https://identity.teamsystem.com/",
  },
];

export const testIdps: IdpList = [
  {
    id: "spiddemo",
    name: "SPID Demo",

    localLogo: require("../img/spid.png"),
    profileUrl: SPID_DEMO_IDPHINT,
  },
];

/**
 * Object of the SPID IDP IDs and the corresponding production hint URLs.
 */
const SPID_IDP_HINTS: { [key: string]: string } = {
  arubaid: "https://loginspid.aruba.it",
  ehtid: "https://id.eht.eu",
  infocamereid: "https://loginspid.infocamere.it",
  infocertid: "https://identity.infocert.it",
  intesiid: "https://idp.intesigroup.com",
  lepidaid: "https://id.lepida.it/idp/shibboleth",
  namirialid: "https://idp.namirialtsp.com/idp",
  posteid: "https://posteid.poste.it",
  sielteid: "https://identity.sieltecloud.it",
  spiditalia: "https://spid.register.it",
  timid: "https://login.id.tim.it/affwebservices/public/saml2sso",
  teamsystemid: "https://spid.teamsystem.com/idp",
  spiddemo: SPID_DEMO_IDPHINT,
};

/**
 * Map of the SPID IDP IDs and the corresponding production hint URLs.
 * If the IDP ID is not present in the map an error is thrown.
 * @param spidIdpId
 * @throws {@link Error} if the IDP ID is not present in the map
 * @returns
 */
export const getSpidIdpHint = (spidIdpId: string) => SPID_IDP_HINTS[spidIdpId];
