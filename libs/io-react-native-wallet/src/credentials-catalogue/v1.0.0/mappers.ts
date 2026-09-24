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
    const { catalog_version, ...rest } = payload;
    return {
      ...rest,
      credentials: payload.credentials.map((credential) => ({
        ...credential,
        authentic_sources: credential.authentic_sources.map(
          ({ contacts, source_type, ...as }) => ({
            ...as,
            contacts: contacts?.map((contact) => ({
              type: "email", // v1.0 contacts are always emails
              value: contact,
            })),
            organization_type: source_type,
          }),
        ),
      })),
    };
  },
  {
    inputSchema: DigitalCredentialsCatalogueJwt,
    outputSchema: DigitalCredentialsCatalogue,
  },
);
