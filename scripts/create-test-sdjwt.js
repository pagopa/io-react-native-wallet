#!/usr/bin/env node
const { Buffer } = require("node:buffer");
const { KJUR, KEYUTIL } = require("jsrsasign");

// cnf.jwk embedded in the SD-JWT
const credentialCnfJwk = {
  kty: "EC",
  kid: "eede745a-4f47-44e7-8551-50c6a1fc0bd6",
  crv: "P-256",
  x: "zHDlxhC3Z1kVF31K8haSKiVUaosZPSo5359SPYymrrk",
  y: "fJZ7J4VRJGLBAkiRJhuJX9X09ftDZbyRyrKbnjGo3ns",
  // d: "_Xp3T3zeNCnuGDme5iNXlh-3LTAN7XhZ1uMzte6QNs8",
};

// Fake Issuer key to sign the SD-JWT
const issuerJwk = {
  kty: "EC",
  alg: "ES256",
  kid: "a38f4a2a-3b7a-49b1-96fe-44e6aced358b",
  crv: "P-256",
  x: "W5cpFOUymIH2Ro2JIkmfiWqg89Y4doEdRnR-fNps7II",
  y: "NC1WrZ64MEi4CVWyXoRPnjxp3EEMT1sePgIwATZEfyc",
  d: "kIyIliVMNZ62aCD3umuFos5wRQGQojVQCgBsOZfF7Wg",
};

const decodeBase64UrlUtf8 = (value) =>
  Buffer.from(value, "base64url").toString("utf8");

const parseSdJwt = (credential) => {
  const hasTrailingSeparator = credential.endsWith("~");
  const normalized = hasTrailingSeparator
    ? credential.slice(0, -1)
    : credential;
  const [issuerJwt, ...disclosures] = normalized.split("~");

  if (!issuerJwt) {
    throw new Error("Invalid SD-JWT: missing issuer JWT part");
  }

  return { issuerJwt, disclosures, hasTrailingSeparator };
};

const decodeJwtPart = (jwt) => {
  const parts = jwt.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT: expected 3 sections separated by dots");
  }

  const header = JSON.parse(decodeBase64UrlUtf8(parts[0]));
  const payload = JSON.parse(decodeBase64UrlUtf8(parts[1]));
  return { header, payload };
};

/**
 * Modify and resign an existing SD-JWT for testing purposes:
 * - Set an expiration date very far in the future so the JWT never expires
 * - Change the cnf.jwk embedded in the credential
 *
 * The key used to resign the JWT is randomly generated and does NOT belong to any Issuer.
 *
 * @example
 * node scripts/create-test-sdjwt.js eyJraWQiOiJI...
 */
const main = () => {
  const [rawSdJwt] = process.argv.slice(2);

  if (!rawSdJwt) {
    console.log("Pass the SD-jwt to resign as argument.");
    console.log("Example: node scripts/create-test-sdjwt.js eyJraWQiOiJI...");
    return;
  }

  const { issuerJwt, disclosures, hasTrailingSeparator } = parseSdJwt(rawSdJwt);
  const { header, payload } = decodeJwtPart(issuerJwt);

  const updatedHeader = {
    ...header,
    kid: issuerJwk.kid,
  };

  const updatedPayload = {
    ...payload,
    cnf: {
      jwk: credentialCnfJwk,
    },
    exp: new Date(2099, 12, 31).getTime() / 1000,
  };

  const reSignedIssuerJwt = KJUR.jws.JWS.sign(
    header.alg,
    JSON.stringify(updatedHeader),
    JSON.stringify(updatedPayload),
    KEYUTIL.getKey(issuerJwk)
  );

  let output = [reSignedIssuerJwt, ...disclosures].join("~");
  if (hasTrailingSeparator) {
    output = `${output}~`;
  }

  console.log("\n");
  console.log(output);
};

main();
