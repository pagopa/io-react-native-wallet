import { IOIcons } from "@pagopa/io-app-design-system";
import type { SupportedCredentialsWithoutPid } from "../store/types";

export const iconByCredentialType: Record<
  SupportedCredentialsWithoutPid,
  IOIcons
> = {
  MDL: "car",
  EuropeanDisabilityCard: "accessibility",
  EuropeanHealthInsuranceCard: "healthCard",
};

export const labelByCredentialType: Record<
  SupportedCredentialsWithoutPid,
  string
> = {
  MDL: "MDL",
  EuropeanDisabilityCard: "DC",
  EuropeanHealthInsuranceCard: "TS",
};
