import {
  RelyingPartySolution,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
import { error, result, toResultOrReject } from "./types";
import getPid from "./get-pid";
import getWalletInstanceAttestation from "./get-attestation";

const QR =
  "aHR0cHM6Ly9kZW1vLnByb3h5LmV1ZGkud2FsbGV0LmRldmVsb3BlcnMuaXRhbGlhLml0L09wZW5JRDRWUD9jbGllbnRfaWQ9aHR0cHMlM0ElMkYlMkZkZW1vLnByb3h5LmV1ZGkud2FsbGV0LmRldmVsb3BlcnMuaXRhbGlhLml0JTJGT3BlbklENFZQJnJlcXVlc3RfdXJpPWh0dHBzJTNBJTJGJTJGZGVtby5wcm94eS5ldWRpLndhbGxldC5kZXZlbG9wZXJzLml0YWxpYS5pdCUyRk9wZW5JRDRWUCUyRnJlcXVlc3QtdXJpJTNGaWQlM0Q1MzAyYWExNC1iMTZlLTRmNjItYTdkYS0wZmFiMDM0ZGE2ODI=";

export default async () => {
  try {
    const walletInstanceKeyTag = Math.random().toString(36).substr(2, 5);
    // obtain new attestation
    const walletInstanceAttestation = await getWalletInstanceAttestation(
      walletInstanceKeyTag
    ).then(toResultOrReject);
    const wiaCryptoContext = createCryptoContextFor(walletInstanceKeyTag);

    // obtain PID
    const pidKeyTag = Math.random().toString(36).substr(2, 5);
    const pidToken = await getPid(pidKeyTag).then(toResultOrReject);
    const pidCryptoContext = createCryptoContextFor(pidKeyTag);

    // Scan/Decode QR
    const { requestURI: authRequestUrl, clientId } =
      RelyingPartySolution.decodeAuthRequestQR(QR);

    // resolve RP's entity configuration
    const entityConfiguration =
      await RelyingPartySolution.getEntityConfiguration()(clientId);

    // get request object
    const requestObj = await RelyingPartySolution.getRequestObject({
      wiaCryptoContext,
    })(walletInstanceAttestation, authRequestUrl, entityConfiguration);

    // Attest Relying Party trust
    // FIXME: [SIW-489] Request Object is coming with an empty trust chain, comment for now
    // const trustAnchorBaseUrl = "https://demo.federation.eudi.wallet.developers.italia.it/";
    // await verifyTrustChain(trustAnchorEntity, requestObj.header.trust_chain);

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
