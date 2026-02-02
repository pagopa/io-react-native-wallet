import { createAppAsyncThunk } from "./utils";
import appFetch from "../utils/fetch";
import { IoWallet, type Trust } from "@pagopa/io-react-native-wallet";
import { selectItwVersion } from "../store/reducers/environment";

export type ValidateTrustChainThunkInput = {
  relyingPartyUrl: string;
  trustAnchorUrl: string;
};

export type ValidateTrustChainThunkOutput = {
  validatedChain: Awaited<ReturnType<Trust.TrustApi["verifyTrustChain"]>>;
};

export const validateTrustChainThunk = createAppAsyncThunk<
  ValidateTrustChainThunkOutput,
  ValidateTrustChainThunkInput
>("trustValidation/validate", async (args, { getState }) => {
  const { trustAnchorUrl, relyingPartyUrl } = args;
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  // 1. Get Trust Anchor Entity Configuration
  console.log("Fetching Trust Anchor Entity Configuration...", trustAnchorUrl);
  console.log("Verifying Trust Chain for Relying Party URL:", relyingPartyUrl);
  const trustAnchorEntityConfig =
    await wallet.Trust.getTrustAnchorEntityConfiguration(trustAnchorUrl, {
      appFetch,
    });

  // This function internally gathers and performs initial verifications.
  const builtChainJwts = await wallet.Trust.buildTrustChain(
    relyingPartyUrl,
    trustAnchorEntityConfig,
    appFetch
  );

  console.log("✅ Chain built successfully");

  // Perform full validation on the built chain (including X.509 if configured)
  const validatedChainTokens = await wallet.Trust.verifyTrustChain(
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
