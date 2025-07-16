import { createAppAsyncThunk } from "./utils";
import appFetch from "../utils/fetch";
import type { ParsedToken } from "../../../src/trust/utils";
import { Trust } from "@pagopa/io-react-native-wallet";

export type ValidateTrustChainThunkInput = {
  relyingPartyUrl: string;
  trustAnchorUrl: string;
};

export type ValidateTrustChainThunkOutput = {
  validatedChain: ParsedToken[];
};

export const validateTrustChainThunk = createAppAsyncThunk<
  ValidateTrustChainThunkOutput,
  ValidateTrustChainThunkInput
>("trustValidation/validate", async ({ relyingPartyUrl, trustAnchorUrl }) => {
  // 1. Get Trust Anchor Entity Configuration
  console.log("Fetching Trust Anchor Entity Configuration...", trustAnchorUrl);
  console.log("Verifying Trust Chain for Relying Party URL:", relyingPartyUrl);
  const trustAnchorEntityConfig =
    await Trust.Build.getTrustAnchorEntityConfiguration(trustAnchorUrl, {
      appFetch,
    });

  const trustAnchorKey = trustAnchorEntityConfig.payload.jwks.keys[0];
  if (!trustAnchorKey) {
    throw new Error("No suitable key found in Trust Anchor JWKS.");
  }

  // This function internally gathers and performs initial verifications.
  const builtChainJwts = await Trust.Build.buildTrustChain(
    relyingPartyUrl,
    trustAnchorKey,
    appFetch
  );

  console.log("✅ Chain built successfully");

  // Perform full validation on the built chain (including X.509 if configured)
  const validatedChainTokens = await Trust.Verify.verifyTrustChain(
    trustAnchorEntityConfig,
    builtChainJwts,
    {
      connectTimeout: 10000,
      readTimeout: 10000,
      requireCrl: true,
    }
  );

  console.log("✅ Chain verified successfully");
  return { validatedChain: validatedChainTokens };
});
