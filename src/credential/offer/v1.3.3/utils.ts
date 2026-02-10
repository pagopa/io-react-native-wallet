import { IoWalletError } from "../../../utils/errors";
import { Logger, LogLevel } from "../../../utils/logging";
import { type ASMetadata, ASMetadataSchema } from "./types";

/**
 * Fetches the Authorization Server metadata
 * @param authenticSourceBaseUrl - The base URL of the Authorization Server (AS).
 * @param appFetch - Optional fetch API implementation.
 * @returns The parsed AS metadata as a validated object.
 * @throws If both endpoints fail or if metadata is invalid.
 */
export const getAuthenticSourceMetadata = async (
  authenticSourceBaseUrl: string,
  appFetch: GlobalFetch["fetch"]
): Promise<ASMetadata> => {
  const url = new URL(authenticSourceBaseUrl);

  const originalPath = url.pathname === "/" ? "" : url.pathname;
  const discoveryPaths = [
    "/.well-known/oauth-authorization-server",
    "/.well-known/openid-configuration",
  ];

  for (const wellKnownPath of discoveryPaths) {
    const fullUrl = `${url.origin}${wellKnownPath}${originalPath}`;

    try {
      Logger.log(LogLevel.INFO, `AS Metadata: ${fullUrl}`);

      const response = await appFetch(fullUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (response.status === 404) {
        Logger.log(
          LogLevel.WARN,
          `${fullUrl} got 404 Not Found, trying next discovery endpoint if available.`
        );
        continue;
      }

      const jsonResponse = await response.json();
      const metadata = ASMetadataSchema.safeParse(jsonResponse);

      if (!metadata.success) {
        throw new IoWalletError(
          `Invalid AS metadata from ${wellKnownPath}: ${metadata.error.message}`
        );
      }

      Logger.log(LogLevel.INFO, `AS Metadata from ${wellKnownPath}`);
      return metadata.data;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      Logger.log(LogLevel.ERROR, `Error ${wellKnownPath}: ${errorMessage}`);

      if (wellKnownPath === discoveryPaths[discoveryPaths.length - 1]) {
        throw new IoWalletError(`Unexpected error ${errorMessage}`);
      }
    }
  }

  throw new IoWalletError(
    "Unable to fetch AS metadata from any known endpoints"
  );
};
