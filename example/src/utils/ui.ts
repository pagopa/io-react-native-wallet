import { IOIcons } from "@pagopa/io-app-design-system";
import type { SupportedCredentialsWithoutPid } from "../store/types";

export const iconByCredentialType: Record<
  SupportedCredentialsWithoutPid,
  IOIcons
> = {
  dc_sd_jwt_mDL: "car",
  mso_mdoc_mDL: "car",
  dc_sd_jwt_EuropeanDisabilityCard: "accessibility",
  dc_sd_jwt_EuropeanHealthInsuranceCard: "healthCard",
  dc_sd_jwt_education_degree: "messageLegal",
  dc_sd_jwt_education_enrollment: "messageLegal",
  dc_sd_jwt_residency: "messageLegal",
  dc_sd_jwt_education_diploma: "messageLegal",
  dc_sd_jwt_education_attestation: "messageLegal",
};

export const labelByCredentialType: Record<
  SupportedCredentialsWithoutPid,
  string
> = {
  mso_mdoc_mDL: "MDL",
  dc_sd_jwt_mDL: "MDL",
  dc_sd_jwt_EuropeanDisabilityCard: "DC",
  dc_sd_jwt_EuropeanHealthInsuranceCard: "TS",
  dc_sd_jwt_education_degree: "ED",
  dc_sd_jwt_education_enrollment: "EE",
  dc_sd_jwt_residency: "RES",
  dc_sd_jwt_education_diploma: "EDIP",
  dc_sd_jwt_education_attestation: "EDAT",
};
