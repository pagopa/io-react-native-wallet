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
import { generate } from "@pagopa/io-react-native-crypto";

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

    // Generate fresh key for credential binding
    // ensure the key esists befor starting the issuing process
    const credentialKeyTag = Math.random().toString(36).substr(2, 5);
    await generate(credentialKeyTag);
    const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

    // TODO: Obtain this from entityConfiguration given credentialID
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
    const authRpRequest = CredentialIssuer.Issuing.authorizeRpIssuing({
      wiaCryptoContext,
    });
    const authenticationRpParams = await authRpRequest(
      instanceAttestation,
      walletProviderBaseUrl,
      credentialIssuerEntityConfiguration,
      authorizationDetails
    );

    // Auth flow vs RP
    //TODO: Remove RelyingPartyEntityConfiguration cast
    const requestObj = await RelyingPartySolution.getRequestObject({
      wiaCryptoContext,
    })(
      instanceAttestation,
      authenticationRpParams.request_uri,
      credentialIssuerEntityConfiguration as RelyingPartyEntityConfiguration
    );

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
    const authorizationResponseText =
      await RelyingPartySolution.sendAuthorizationResponse({
        pidCryptoContext,
      })(requestObj, [pidToken, claims]);
    let authorizationCode = authorizationResponseText.response_code;

    if (authorizationCode) {
      const authRequest = CredentialIssuer.Issuing.authorizeCredentialIssuing(
        {}
      );
      const authConf = await authRequest(
        instanceAttestation,
        walletProviderBaseUrl,
        credentialIssuerEntityConfiguration,
        authenticationRpParams,
        authorizationCode
      );

      // Credential request
      const credentialRequest = CredentialIssuer.Issuing.getCredential({
        credentialCryptoContext,
      });
      const credential = await credentialRequest(
        authConf,
        credentialIssuerEntityConfiguration
      );
      console.log(credential);
    }

    return result("OK");
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
