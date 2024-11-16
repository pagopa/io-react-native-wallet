import { IOIcons } from "@pagopa/io-app-design-system";
import type { SupportedCredentialsWithoutPid } from "../store/types";

export const iconByCredentialType: {
  [key in SupportedCredentialsWithoutPid]: IOIcons;
} = {
  MDL: "car",
  EuropeanDisabilityCard: "accessibility",
  EuropeanHealthInsuranceCard: "healthCard",
};

export const labelByCredentialType: {
  [key in SupportedCredentialsWithoutPid]: string;
} = {
  MDL: "MDL",
  EuropeanDisabilityCard: "DC",
  EuropeanHealthInsuranceCard: "TS",
};
