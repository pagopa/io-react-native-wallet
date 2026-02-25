import { createMapper } from "../../utils/mappers";
import { DigitalCredentialsCatalogue } from "../api/DigitalCredentialsCatalogue";
import { DigitalCredentialsCatalogueJwt } from "./types";

export const mapToCredentialsCatalogue = createMapper(
  ({ payload }) => ({
    ...payload,
    credentials: payload.credentials.map((credential) => ({
      ...credential,
      authentic_sources: credential.authentic_sources.map((as) => ({
        ...as,
        organization_type: as.source_type,
      })),
    })),
  }),
  {
    inputSchema: DigitalCredentialsCatalogueJwt,
    outputSchema: DigitalCredentialsCatalogue,
  }
);
