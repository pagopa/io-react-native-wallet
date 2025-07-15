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
};

export const labelByCredentialType: Record<
  SupportedCredentialsWithoutPid,
  string
> = {
  mso_mdoc_mDL: "MDL",
  dc_sd_jwt_mDL: "MDL",
  dc_sd_jwt_EuropeanDisabilityCard: "DC",
  dc_sd_jwt_EuropeanHealthInsuranceCard: "TS",
};
