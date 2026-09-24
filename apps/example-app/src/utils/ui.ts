import { IOIcons } from "@pagopa/io-app-design-system";

import type { SupportedCredentialsWithoutPid } from "../store/types";

export const iconByCredentialType: Record<
  SupportedCredentialsWithoutPid,
  IOIcons
> = {
  dc_sd_jwt_education_attendance: "messageLegal",
  dc_sd_jwt_education_degree: "messageLegal",
  dc_sd_jwt_education_diploma: "messageLegal",
  dc_sd_jwt_education_enrollment: "messageLegal",
  dc_sd_jwt_EuropeanDisabilityCard: "accessibility",
  dc_sd_jwt_EuropeanHealthInsuranceCard: "healthCard",
  dc_sd_jwt_mDL: "car",
  dc_sd_jwt_residency: "messageLegal",
  mso_mdoc_mDL: "car",
  mso_mdoc_proof_of_age: "ok",
};

export const labelByCredentialType: Record<
  SupportedCredentialsWithoutPid,
  string
> = {
  dc_sd_jwt_education_attendance: "EDAT",
  dc_sd_jwt_education_degree: "ED",
  dc_sd_jwt_education_diploma: "EDIP",
  dc_sd_jwt_education_enrollment: "EE",
  dc_sd_jwt_EuropeanDisabilityCard: "DC",
  dc_sd_jwt_EuropeanHealthInsuranceCard: "TS",
  dc_sd_jwt_mDL: "MDL",
  dc_sd_jwt_residency: "RES",
  mso_mdoc_mDL: "MDL",
  mso_mdoc_proof_of_age: "PoA",
};
