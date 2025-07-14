import { IOIcons } from "@pagopa/io-app-design-system";
import type { SupportedCredentialsWithoutPid } from "../store/types";

export const iconByCredentialType: Record<
  SupportedCredentialsWithoutPid,
  IOIcons
> = {
  "org.iso.18013.5.1.mDL": "car",
  EuropeanDisabilityCard: "accessibility",
  EuropeanHealthInsuranceCard: "healthCard",
  "eu.europa.ec.eudi.hiid.1": "healthCard",
  mso_mdoc_CompanyBadge: "categJobOffers",
};

export const labelByCredentialType: Record<
  SupportedCredentialsWithoutPid,
  string
> = {
  "org.iso.18013.5.1.mDL": "MDL",
  EuropeanDisabilityCard: "DC",
  EuropeanHealthInsuranceCard: "TS",
  "eu.europa.ec.eudi.hiid.1": "HID",
  mso_mdoc_CompanyBadge: "BG",
};
