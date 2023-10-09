import {
  AuthorizationDetails,
  CredentialIssuer,
  RelyingPartyEntityConfiguration,
  RelyingPartySolution,
  createCryptoContextFor,
  getEntityConfiguration,
} from "@pagopa/io-react-native-wallet";
import { error, result, toResultOrReject } from "./types";
import getWalletInstanceAttestation from "./get-attestation";
import getPid from "./get-pid";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";
const credentialProviderBaseUrl = "https://api.eudi-wallet-it-issuer.it/rp";

export default async () => {
  try {
    // obtain wallet instance attestation
    const walletInstanceKeyTag = Math.random().toString(36).substr(2, 5);
    const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);
    const instanceAttestation = await getWalletInstanceAttestation(
      walletInstanceKeyTag
    ).then(toResultOrReject);

    // obtain PID
    const pidKeyTag = Math.random().toString(36).substr(2, 5);
    const pidToken = await getPid(pidKeyTag).then(toResultOrReject);
    const pidCryptoContext = createCryptoContextFor(pidKeyTag);

    // Obtain credential issuer metadata
    //TODO: Change to getCredentialIssuerEntityConfiguration
    const credentialIssuerEntityConfiguration = await getEntityConfiguration(
      credentialProviderBaseUrl
    );

    const authorizationDetails: AuthorizationDetails = [
      {
        credential_definition: {
          type: "mDL",
        },
        format: "vc+sd-jwt",
        type: "openid_credential",
      },
    ];

    // Auth Token request
    const authRequest = CredentialIssuer.Issuing.authorizeIssuing({
      wiaCryptoContext,
    });
    const authenticationParams = await authRequest(
      instanceAttestation,
      walletProviderBaseUrl,
      credentialIssuerEntityConfiguration,
      authorizationDetails
    );

    console.log(" ** authenticationParams **", authenticationParams);

    //TODO: Remove RelyingPartyEntityConfiguration cast
    const requestObj = await RelyingPartySolution.getRequestObject({
      wiaCryptoContext,
    })(
      instanceAttestation,
      authenticationParams.request_uri,
      credentialIssuerEntityConfiguration as RelyingPartyEntityConfiguration
    );

    console.log("** requestObj **", requestObj);

    const claims = [
      "unique_id",
      "given_name",
      "family_name",
      "birthdate",
      "place_of_birth",
      "tax_id_number",
      "evidence",
    ];

    // Submit authorization response
    const ok = await RelyingPartySolution.sendAuthorizationResponse({
      pidCryptoContext,
    })(requestObj, [pidToken, claims]);

    return result(ok);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
