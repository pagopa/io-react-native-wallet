import {
  SignJWT,
  thumbprint,
  decode as decodeJwt,
} from "@pagopa/io-react-native-jwt";
import { type TrustmarkApi as Api } from "../api";
import * as WalletInstanceAttestation from "../../../wallet-instance-attestation/v1.0.0/utils";
import { IoWalletError } from "../../../utils/errors";
import { obfuscateString } from "../../../utils/string";
import { LogLevel, Logger } from "../../../utils/logging";

export const getCredentialTrustmark: Api["getCredentialTrustmark"] = async ({
  walletInstanceAttestation,
  wiaCryptoContext,
  credentialType,
  docNumber,
  expirationTime = "2m",
}) => {
  /**
   * Check that the public key used to sign the trustmark is the one used for the WIA
   */
  const holderBindingKey = await wiaCryptoContext.getPublicKey();
  const decodedWia = WalletInstanceAttestation.decode(
    walletInstanceAttestation
  );

  Logger.log(
    LogLevel.DEBUG,
    `Decoded wia ${JSON.stringify(decodedWia.payload)} with holder binding key ${JSON.stringify(holderBindingKey)}`
  );

  /**
   * Check that the WIA is not expired
   */
  if (decodedWia.payload.exp * 1000 < Date.now()) {
    Logger.log(
      LogLevel.ERROR,
      `Wallet Instance Attestation expired with exp: ${decodedWia.payload.exp}`
    );
    throw new IoWalletError("Wallet Instance Attestation expired");
  }

  /**
   * Verify holder binding by comparing thumbprints of the WIA and the CryptoContext key
   */
  const wiaThumbprint = await thumbprint(decodedWia.payload.cnf.jwk);
  const cryptoContextThumbprint = await thumbprint(holderBindingKey);

  if (wiaThumbprint !== cryptoContextThumbprint) {
    Logger.log(
      LogLevel.ERROR,
      `Failed to verify holder binding for status attestation, expected thumbprint: ${cryptoContextThumbprint}, got: ${wiaThumbprint}`
    );
    throw new IoWalletError(
      `Failed to verify holder binding for status attestation, expected thumbprint: ${cryptoContextThumbprint}, got: ${wiaThumbprint}`
    );
  }

  Logger.log(
    LogLevel.DEBUG,
    `Wia thumbprint: ${wiaThumbprint} CryptoContext thumbprint: ${cryptoContextThumbprint}`
  );

  /**
   * Generate Trustmark signed JWT
   */
  const signedTrustmarkJwt = await new SignJWT(wiaCryptoContext)
    .setProtectedHeader({
      alg: "ES256",
    })
    .setPayload({
      iss: walletInstanceAttestation,
      /**
       * If present, the document number is obfuscated before adding it to the payload
       */
      ...(docNumber ? { sub: obfuscateString(docNumber) } : {}),
      subtyp: credentialType,
    })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign();

  const decodedTrustmark = decodeJwt(signedTrustmarkJwt);

  return {
    jwt: signedTrustmarkJwt,
    expirationTime: decodedTrustmark.payload.exp ?? 0,
  };
};
