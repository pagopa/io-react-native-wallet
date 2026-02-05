import { createMapper } from "../../utils/mappers";
import { DigitalCredentialsCatalogue } from "../api/DigitalCredentialsCatalogue";
import { DigitalCredentialsCatalogueJwt } from "./types";

export const mapToCredentialsCatalogue = createMapper(
  (input) => input.payload,
  {
    inputSchema: DigitalCredentialsCatalogueJwt,
    outputSchema: DigitalCredentialsCatalogue,
  }
);
