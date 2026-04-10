import { createMapper } from "../../utils/mappers";
import {
  DigitalCredentialsCatalogue,
  type DigitalCredentialsCatalogue as DigitalCredentialsCatalogueType,
} from "../api/DigitalCredentialsCatalogue";
import {
  DigitalCredentialsCatalogueJwt,
  type DigitalCredentialsCatalogueJwt as DigitalCredentialsCatalogueJwtType,
} from "./types";

export const mapToCredentialsCatalogue = createMapper<
  DigitalCredentialsCatalogueJwtType,
  DigitalCredentialsCatalogueType
>(
  ({ payload }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { catalog_version, ...rest } = payload;
    return {
      ...rest,
      credentials: payload.credentials.map((credential) => ({
        ...credential,
        authentic_sources: credential.authentic_sources.map(
          ({ source_type, ...as }) => ({
            ...as,
            organization_type: source_type,
          })
        ),
      })),
    };
  },
  {
    inputSchema: DigitalCredentialsCatalogueJwt,
    outputSchema: DigitalCredentialsCatalogue,
  }
);
