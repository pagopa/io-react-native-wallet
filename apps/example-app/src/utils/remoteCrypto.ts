import { Buffer } from "@craftzdog/react-native-buffer";
import {
  getWalletProviderClient,
  type Signer,
} from "@io-app-it-wallet/io-react-native-wallet";
import { thumbprint } from "@pagopa/io-react-native-jwt";
import QuickCrypto from "react-native-quick-crypto";

import appFetch from "./fetch";

/** DER prefix of a SHA-256 DigestInfo, which NSSAM `hashsign` expects before the digest. */
const SHA256_DIGEST_INFO_PREFIX = "3031300d060960864801650304020105000420";

/** The NSSAM Master RSA public key (3072 bit, e = 65537) which signs the session keys. */
const NSSAM_MASTER_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA8wwBN03bIlfiB6TzCP+e
iWt1c6mGaNuHP8XI3aNmeJocZvJyscyi5sbXAoRSOvTWcfosHIeVR+S7Gte1AR28
ukitkr6KyjAd9Lgidtz+hSkA5mvyw5lrQ7nEwNB/ctqiYBdQjfOXDRYi0iQO8GEo
VHjeDtQfvriqd6/2rvKsPHD3L2yljab2IZcaW4O+c2wa5Ymx0gt7h0whH+O5GjXg
84j3yYfyakYLeOaqGxTVZpgxtxfXmgRURGcC9oSkZS6JQ0rEFBRZZabMoyarKkr7
5N7+AVBRgbCUAN2ttHVQNk6aZh+hNOZG1JHDXrsUtIBVvxBdQ/XGjpXRCjvrHApZ
owIDAQAB
-----END PUBLIC KEY-----`;

export interface RemoteKey {
  /** The KeyBlob of the private key, encrypted by the HSM: it must be sent with every signature. */
  encryptedKey: string;
  /** The Key Enrollment Certificate, which attests the key in Key Attestation requests. */
  kec: string;
  publicKey: { crv: "P-256"; kty: "EC"; x: string; y: string };
}

export interface RemoteWscdContext {
  walletProviderBaseUrl: string;
  /** The user identifier sent as `x-user-id` to the Wallet Provider. */
  xUserId: string;
}

/**
 * Enroll a new EC P-256 key pair on the Remote WSCD through the Wallet Provider.
 * The returned key must be persisted by the App to sign with {@link createRemoteSignerFor}.
 *
 * @param pin The Remote WSCD PIN of the user
 * @param context The Remote WSCD context
 * @returns the enrolled key
 */
export const enrollRemoteKey = async (
  pin: string,
  context: RemoteWscdContext,
): Promise<RemoteKey> => {
  const { api, header, session } = await openSession(context, (accessToken) =>
    enrollRequest(accessToken, pin),
  );
  const { encryptedKey, kec, publicKey } = await api.post("/remote-wscd/keys", {
    body: session,
    header,
  });

  return {
    encryptedKey,
    kec,
    // The Wallet Provider returns the EC coordinates X and Y in `modulus` and `exponent`
    publicKey: {
      crv: "P-256",
      kty: "EC",
      x: Buffer.from(publicKey.modulus, "base64").toString("base64url"),
      y: Buffer.from(publicKey.exponent, "base64").toString("base64url"),
    },
  };
};

/**
 * Create a {@link Signer} bound to a key enrolled on the Remote WSCD with {@link enrollRemoteKey}.
 *
 * @param remoteKey The enrolled key
 * @param pin The Remote WSCD PIN of the user, required by every signature
 * @param context The Remote WSCD context
 * @returns the signer
 */
export const createRemoteSignerFor = (
  remoteKey: RemoteKey,
  pin: string,
  context: RemoteWscdContext,
): Signer => ({
  getPublicKey: async () => ({
    ...remoteKey.publicKey,
    kid: await thumbprint(remoteKey.publicKey),
  }),
  kind: "REMOTE",
  sign: async (value) => {
    const digestInfo = Buffer.concat([
      Buffer.from(SHA256_DIGEST_INFO_PREFIX, "hex"),
      QuickCrypto.createHash("sha256").update(value, "utf8").digest(),
    ]).toString("base64");

    const { api, header, session } = await openSession(context, (accessToken) =>
      hashSignRequest(accessToken, pin, digestInfo),
    );
    const { signature } = await api.post("/remote-wscd/signatures", {
      body: { ...session, encryptedKey: remoteKey.encryptedKey },
      header,
    });

    return rawSignatureToDer(Buffer.from(signature, "base64"));
  },
});

/**
 * Open an NSSAM session through the Wallet Provider and encrypt the operation request with its session key.
 */
const openSession = async (
  { walletProviderBaseUrl, xUserId }: RemoteWscdContext,
  request: (accessToken: string) => object,
) => {
  const api = getWalletProviderClient({ appFetch, walletProviderBaseUrl });
  const header = { "x-user-id": xUserId };

  const { access_token: jwtToken } = await api.post("/auth/token-exchanges", {
    header,
  });

  const { CryptoKey, subtle } = QuickCrypto.webcrypto;

  const keyPair = await subtle.generateKey(
    {
      hash: "SHA-256",
      modulusLength: 3072,
      name: "RSA-OAEP",
      publicExponent: new Uint8Array([1, 0, 1]),
    },
    true,
    ["encrypt", "decrypt"],
  );
  if (
    !("privateKey" in keyPair) ||
    !(keyPair.privateKey instanceof CryptoKey) ||
    !(keyPair.publicKey instanceof CryptoKey)
  ) {
    throw new Error("Unable to generate the session key pair");
  }
  const jwk = await subtle.exportKey("jwk", keyPair.publicKey);
  if (jwk instanceof ArrayBuffer || !jwk.e || !jwk.n) {
    throw new Error("Unable to export the session public key");
  }

  const { encryptionKey, sessionId, signature } = await api.post(
    "/remote-wscd/sessions",
    {
      body: {
        clientPubKey: {
          exponent: Buffer.from(jwk.e, "base64url").toString("base64"),
          modulus: Buffer.from(jwk.n, "base64url").toString("base64"),
        },
        jwtToken,
      },
      header,
    },
  );

  // NSSAM signs the first n bytes of the base64 `encryptionKey`, where n is the length of the decoded key
  const encryptedSessionKey = Buffer.from(encryptionKey, "base64");
  const isSignedByMaster = QuickCrypto.createVerify("SHA256")
    .update(
      Buffer.from(encryptionKey, "utf8").subarray(
        0,
        encryptedSessionKey.length,
      ),
    )
    .verify(
      { format: "pem", key: NSSAM_MASTER_PUBLIC_KEY },
      Buffer.from(signature, "base64"),
    );
  if (!isSignedByMaster) {
    throw new Error("The session key is not signed by the NSSAM Master key");
  }

  const rawSessionKey = await subtle.decrypt(
    { name: "RSA-OAEP" },
    keyPair.privateKey,
    encryptedSessionKey,
  );
  // AES-256-GCM is required a shorter key would silently downgrade to AES-128/192
  if (rawSessionKey.byteLength !== 32) {
    throw new Error("The session key is not an AES-256 key");
  }
  const sessionKey = await subtle.importKey(
    "raw",
    rawSessionKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );
  const iv = QuickCrypto.randomBytes(16);
  const encryptedRequest = await subtle.encrypt(
    { iv, name: "AES-GCM" },
    sessionKey,
    Buffer.from(JSON.stringify(request(jwtToken))),
  );

  // NSSAM format: ivLength || tagLength || iv || ciphertext || tag
  const data = Buffer.concat([
    Buffer.from([16, 16]),
    iv,
    Buffer.from(encryptedRequest),
  ]).toString("base64");

  return { api, header, session: { data, jwtToken, sessionId } };
};

/* eslint-disable perfectionist/sort-objects -- NSSAM rejects requests whose fields are not in this order */
const enrollRequest = (accessToken: string, pin: string) => ({
  cmd: 192,
  access_token: accessToken,
  pin,
  keyType: 1, // EC
});

const hashSignRequest = (
  accessToken: string,
  pin: string,
  digestInfo: string,
) => ({
  cmd: 193,
  access_token: accessToken,
  pin,
  digest_info: digestInfo,
});
/* eslint-enable perfectionist/sort-objects */

/**
 * Encode the raw `r || s` ECDSA signature returned by NSSAM as DER, as required by {@link Signer}.
 */
const rawSignatureToDer = (signature: Buffer) => {
  const toDerInteger = (value: Buffer) => {
    // Strip the leading zeros, keeping at least one byte
    const firstNonZero = value.findIndex((byte) => byte !== 0);
    const unsigned = value.subarray(
      firstNonZero === -1 ? value.length - 1 : firstNonZero,
    );
    // A leading zero keeps the integer positive when its most significant bit is set
    const integer =
      unsigned.readUInt8(0) >= 0x80
        ? Buffer.concat([Buffer.from([0]), unsigned])
        : unsigned;
    return Buffer.concat([Buffer.from([0x02, integer.length]), integer]);
  };
  const r = toDerInteger(signature.subarray(0, signature.length / 2));
  const s = toDerInteger(signature.subarray(signature.length / 2));

  return Buffer.concat([
    Buffer.from([0x30, r.length + s.length]),
    r,
    s,
  ]).toString("base64");
};
