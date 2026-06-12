import { CredentialOffer, IoWallet } from "@pagopa/io-react-native-wallet";
import appFetch from "../utils/fetch";
import { createAppAsyncThunk } from "./utils";
import { selectItwVersion } from "../store/reducers/environment";

export type GetCredentialOfferThunkInput = {
  qrcode: string;
};

export type GetCredentialOfferThunkOutput =
  CredentialOffer.ExtractGrantDetailsResult;

export const getCredentialOfferThunk = createAppAsyncThunk<
  GetCredentialOfferThunkOutput,
  GetCredentialOfferThunkInput
>("credential/offerGet", async (args, { getState }) => {
  const itwVersion = selectItwVersion(getState());
  const wallet = new IoWallet({ version: itwVersion });

  // 1) Resolve and validate the credential offer
  const credentialOffer = await wallet.CredentialsOffer.resolveCredentialOffer(
    args.qrcode,
    { fetch: appFetch }
  );

  // 2) Extract grant details
  const grantDetails =
    wallet.CredentialsOffer.extractGrantDetails(credentialOffer);

  // 3) Evaluate issuer trust
  const { issuerConf } = await wallet.CredentialIssuance.evaluateIssuerTrust(
    credentialOffer.credential_issuer,
    {
      authorizationServer:
        grantDetails.authorizationCodeGrant.authorizationServer,
      appFetch,
    }
  );

  // 4) Validate credential offer
  await wallet.CredentialsOffer.validateCredentialOffer({
    offer: credentialOffer,
    credentialIssuerMetadata: {
      authorization_servers: issuerConf.authorization_servers,
    },
  });

  return grantDetails;
});
