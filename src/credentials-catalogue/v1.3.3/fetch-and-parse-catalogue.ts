import { UnimplementedFeatureError } from "../../utils/errors";
import { type CredentialsCatalogueApi as Api } from "../api";

export const fetchAndParseCatalogue: Api["fetchAndParseCatalogue"] =
  async () => {
    throw new UnimplementedFeatureError(fetchAndParseCatalogue.name, "1.3.3");
  };
