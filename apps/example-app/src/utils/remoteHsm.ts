import {
  getWalletProviderClient,
  type Signer,
  type WalletProviderClient,
} from "@io-app-it-wallet/io-react-native-wallet";
import { thumbprint } from "@pagopa/io-react-native-jwt";
import crypto from "crypto";

/**
 * Remote WSCD (NSSAM HSM).
 *
 * Every operation (enroll, sign, change PIN) runs in its own NSSAM session:
 * 1. the App exchanges its wallet session for a short-lived access token;
 * 2. the App generates an ephemeral RSA 3072 key pair and opens a session with its public key;
 * 3. the HSM returns an AES-256 session key, encrypted for the App and signed with the Master RSA key (pinned in the App);
 * 4. only the `data` field of the operation (PIN, token, parameters) is encrypted with AES-256-GCM using the session key.
 *
 * NOTE: the exact layout of the encrypted `data` (SAD) is defined by the confidential NSSAM documentation.
 * The layout used here (see {@link encryptData} and the `*Sad` builders) is an assumption to be aligned with it.
 */

type PublicJwk = Awaited<ReturnType<Signer["getPublicKey"]>>;

const SESSION_KEY_BITS = 3072;
const AES_GCM_IV_LENGTH = 12;
const NSSAM_KEY_TYPE = { ECC: 1, RSA: 0 } as const;

export interface RemoteHsmContext {
  client: WalletProviderClient;
  /**
   * PEM of the NSSAM Master RSA public key. It must be pinned in the App (never fetched from the backend),
   * otherwise a compromised backend could replace the session key.
   */
  masterPublicKeyPem: string;
}

export interface RemoteKey {
  /** The KeyBlob returned by the HSM, to be persisted by the consumer */
  keyBlob: string;
  /** The public key of the remote key, with its `kid` */
  publicKey: PublicJwk;
}

interface RemoteSession {
  encrypt: (sad: Record<string, unknown>) => string;
  jwtToken: string;
  sessionId: string;
}

/**
 * Build the typed Wallet Provider client used to talk to the remote WSCD proxy.
 * @param headers Extra headers added to each request (e.g. the user session identifier required by the backend)
 */
export const createRemoteHsmClient = (params: {
  appFetch?: typeof fetch;
  headers?: Record<string, string>;
  walletProviderBaseUrl: string;
}): WalletProviderClient => {
  const { appFetch = fetch, headers, walletProviderBaseUrl } = params;
  return getWalletProviderClient({
    appFetch: (input, init) =>
      appFetch(input, { ...init, headers: { ...init?.headers, ...headers } }),
    walletProviderBaseUrl,
  });
};

/**
 * Enroll a new key in the remote HSM.
 * @param keyType Type of the key to generate. Only EC is implemented: RSA throws
 * @param pin The PIN that will protect the key
 */
export const enrollRemoteKey = async (
  ctx: RemoteHsmContext,
  params: { keyType?: "EC" | "RSA"; pin: string },
): Promise<RemoteKey> => {
  const { keyType = "EC", pin } = params;
  // Fail before opening an HSM session
  if (keyType === "RSA") {
    throw new Error("RSA remote keys are not implemented");
  }
  return withSession(ctx, async (session) => {
    const { encryptedKey, publicKey } = await ctx.client.post(
      "/remote-wscd/keys",
      {
        body: {
          data: session.encrypt({
            jwt: session.jwtToken,
            keyType: NSSAM_KEY_TYPE.ECC,
            pin,
          }),
          jwtToken: session.jwtToken,
          sessionId: session.sessionId,
        },
      },
    );
    return { keyBlob: encryptedKey, publicKey: await toJwk(publicKey) };
  });
};

/**
 * Change the PIN of a remote key.
 * @returns The new KeyBlob, which replaces the old one
 */
export const changeRemoteKeyPin = (
  ctx: RemoteHsmContext,
  params: { keyBlob: string; newPin: string; pin: string },
): Promise<string> =>
  withSession(ctx, async (session) => {
    const { encryptedKey } = await ctx.client.post("/remote-wscd/pin-changes", {
      body: {
        data: session.encrypt({
          jwt: session.jwtToken,
          newPin: params.newPin,
          pin: params.pin,
        }),
        encryptedKey: params.keyBlob,
        jwtToken: session.jwtToken,
        sessionId: session.sessionId,
      },
    });
    return encryptedKey;
  });

/**
 * Create a remote {@link Signer} bound to a key of the remote HSM.
 * Each signature opens a dedicated HSM session and asks the user's PIN through `getPin`.
 *
 * @param key The remote key, as returned by {@link enrollRemoteKey}
 * @param getPin Callback which provides the user's PIN at signing time
 */
export const createRemoteSignerFor = (
  ctx: RemoteHsmContext,
  key: RemoteKey,
  getPin: () => Promise<string>,
): Signer => ({
  getPublicKey: async () => key.publicKey,
  isRemote: true,
  // The value is provided as is: the HSM signs its SHA-256 digest
  sign: async (value) => {
    const pin = await getPin();
    return withSession(ctx, async (session) => {
      const { signature } = await ctx.client.post("/remote-wscd/signatures", {
        body: {
          data: session.encrypt({
            digest: crypto.createHash("sha256").update(value).digest("base64"),
            jwt: session.jwtToken,
            pin,
          }),
          encryptedKey: key.keyBlob,
          jwtToken: session.jwtToken,
          sessionId: session.sessionId,
        },
      });
      return signature;
    });
  },
});

/**
 * Run an operation in a dedicated HSM session, which is cancelled if the operation does not complete.
 */
const withSession = async <R>(
  ctx: RemoteHsmContext,
  operation: (session: RemoteSession) => Promise<R>,
): Promise<R> => {
  const { access_token: jwtToken } = await ctx.client.post(
    "/auth/token-exchanges",
  );

  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: SESSION_KEY_BITS,
    privateKeyEncoding: { format: "pem", type: "pkcs8" },
    publicKeyEncoding: { format: "der", type: "pkcs1" },
  });

  const { encryptionKey, sessionId, signature } = await ctx.client.post(
    "/remote-wscd/sessions",
    { body: { clientPubKey: parseRsaPublicKey(publicKey), jwtToken } },
  );

  try {
    const encryptedKey = Buffer.from(encryptionKey, "base64");
    // Anti-MITM: the session key must be signed by the pinned Master RSA key
    const isGenuine = crypto
      .createVerify("RSA-SHA256")
      .update(encryptedKey)
      .verify(ctx.masterPublicKeyPem, Buffer.from(signature, "base64"));
    if (!isGenuine) {
      throw new Error("Invalid session key signature from the remote HSM");
    }

    const aesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        oaepHash: "sha256",
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      },
      encryptedKey,
    );

    return await operation({
      encrypt: (sad) => encryptData(aesKey, sad),
      jwtToken,
      sessionId,
    });
  } catch (e) {
    // A session serves exactly one operation: release it to avoid hitting the sessions limit
    await ctx.client
      .post("/remote-wscd/session-cancellations", {
        body: { jwtToken, sessionId },
      })
      .catch(() => undefined);
    throw e;
  }
};

/**
 * Encrypt the SAD with AES-256-GCM. The output is base64(iv | ciphertext | tag).
 */
const encryptData = (aesKey: Buffer, sad: Record<string, unknown>) => {
  const iv = crypto.randomBytes(AES_GCM_IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-gcm", aesKey, iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(sad), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, ciphertext, cipher.getAuthTag()]).toString(
    "base64",
  );
};

/**
 * Read modulus and exponent from a DER encoded PKCS#1 RSAPublicKey (SEQUENCE { n INTEGER, e INTEGER }).
 */
const parseRsaPublicKey = (der: Buffer) => {
  let offset = 0;
  const readLength = () => {
    const first = der[offset++] as number;
    if (first < 0x80) return first;
    const bytes = first - 0x80;
    let length = 0;
    for (let i = 0; i < bytes; i++)
      length = length * 256 + (der[offset++] as number);
    return length;
  };
  const readInteger = () => {
    offset++; // INTEGER tag
    const length = readLength();
    const value = der.subarray(offset, offset + length);
    offset += length;
    // Drop the sign padding byte
    return (value[0] === 0 ? value.subarray(1) : value).toString("base64");
  };

  offset++; // SEQUENCE tag
  readLength();
  const modulus = readInteger();
  const exponent = readInteger();
  return { exponent, modulus };
};

/**
 * Convert the EC public key returned by the HSM to a JWK.
 * `modulus` carries the X coordinate and `exponent` the Y coordinate (P-256 is assumed).
 */
const toJwk = async (publicKey: {
  exponent: string;
  modulus: string;
}): Promise<PublicJwk> => {
  const toBase64Url = (b64: string) =>
    Buffer.from(b64, "base64").toString("base64url");
  const jwk = {
    crv: "P-256" as const,
    kty: "EC" as const,
    x: toBase64Url(publicKey.modulus),
    y: toBase64Url(publicKey.exponent),
  };
  return { ...jwk, kid: await thumbprint(jwk) } as PublicJwk;
};
