import {
  Credential,
  Trust,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import { error, result, toResultOrReject } from "./types";
import getWalletInstanceAttestation from "./get-attestation";
import { generate } from "@pagopa/io-react-native-crypto";
import getPid from "./get-pid";
import type { CryptoContext } from "@pagopa/io-react-native-jwt";

const walletProviderBaseUrl = "https://io-d-wallet-it.azurewebsites.net";

const rnd = () => Math.random().toString(36).substr(2, 5);

// Workaround for Typescript parent narrowing
// credit: https://github.com/microsoft/TypeScript/issues/42384#issuecomment-1083119502
function assertField<
  T extends { [field in Field]?: T[field] },
  Field extends keyof T & string
>(
  obj: T,
  field: Field
): obj is T & { [field in Field]: NonNullable<T[field]> } {
  if (!obj[field]) false;
  return true;
}

// PID presentation flow as a USer Authorization method
const completeUserAuthorizationWithPID =
  ({
    rpConf,
    walletInstanceAttestation,
    wiaCryptoContext,
  }: {
    rpConf: Trust.RelyingPartyEntityConfiguration["payload"]["metadata"];
    wiaCryptoContext: CryptoContext;
    walletInstanceAttestation: string;
  }): Credential.Issuance.CompleteUserAuthorization =>
  async (requestUri, _clientId) => {
    // assume PID is already obtained by the wallet
    const pidKeyTag = Math.random().toString(36).substr(2, 5);
    const pidToken = await getPid(pidKeyTag).then(toResultOrReject);
    const pidCryptoContext = createCryptoContextFor(pidKeyTag);

    // select claims to be disclose from pid
    // these would be selected by users in the UI
    const claims = [
      "unique_id",
      "given_name",
      "family_name",
      "birthdate",
      "place_of_birth",
      "tax_id_number",
      "evidence",
    ];

    // get request object
    const { requestObject } = await Credential.Presentation.getRequestObject(
      requestUri,
      rpConf,
      {
        wiaCryptoContext,
        walletInstanceAttestation,
      }
    );

    // Submit authorization response
    const { response_code } =
      await Credential.Presentation.sendAuthorizationResponse(
        requestObject,
        rpConf,
        [pidToken, claims, pidCryptoContext],
        {
          walletInstanceAttestation,
        }
      );

    return { code: response_code || "code" };
  };

export default async () => {
  try {
    // obtain wallet instance attestation
    const walletInstanceKeyTag = rnd();
    const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);
    const walletInstanceAttestation = await getWalletInstanceAttestation(
      walletInstanceKeyTag
    ).then(toResultOrReject);

    const { type: credentialType, url: credentialProviderBaseUrl } =
      /* startFLow()*/ {
        type: "EuropeanDisabilityCard",
        url: "https://api.eudi-wallet-it-issuer.it/rp",
      };

    const { issuerConf } = await Credential.Issuance.evaluateIssuerTrust(
      credentialProviderBaseUrl
    );

    const { clientId, requestUri } =
      await Credential.Issuance.startUserAuthorization(
        issuerConf,
        credentialType,
        {
          walletInstanceAttestation,
          walletProviderBaseUrl,
          wiaCryptoContext,
        }
      );

    // Enforcing Issuer to have relying party configuration
    if (!assertField(issuerConf, "wallet_relying_party")) {
      throw new Error(
        "Expecting the Credential Issuer to act as a Relying Party in order to accept PID presentation"
      );
    }

    // PID presentation sub-flow
    const { code } = await completeUserAuthorizationWithPID({
      rpConf: issuerConf,
      walletInstanceAttestation,
      wiaCryptoContext,
    })(requestUri, clientId);

    const { accessToken, nonce } = await Credential.Issuance.authorizeAccess(
      issuerConf,
      code,
      clientId,
      {
        walletInstanceAttestation,
        walletProviderBaseUrl,
      }
    );

    const credentialKeyTag = rnd();
    await generate(credentialKeyTag);
    const credentialCryptoContext = createCryptoContextFor(credentialKeyTag);

    const { credential } = await Credential.Issuance.obtainCredential(
      issuerConf,
      accessToken,
      nonce,
      clientId,
      credentialType,
      {
        walletProviderBaseUrl,
        credentialCryptoContext,
      }
    );

    console.log(credential);

    return result(credential);
  } catch (e) {
    console.error(e);
    return error(e);
  }
};
