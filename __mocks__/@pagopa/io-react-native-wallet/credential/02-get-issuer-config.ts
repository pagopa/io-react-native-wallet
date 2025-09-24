export const mockedOpenIdCredentialIssuer = {
  batch_credential_issuance: {
    batch_size: 30,
  },
  credential_configurations_supported: {
    "eu.europa.ec.eudi.age_verification_mdoc": {
      claims: [
        {
          display: [
            {
              locale: "en",
              name: "Age Over 18",
            },
          ],
          mandatory: true,
          path: ["eu.europa.ec.av.1", "age_over_18"],
          value_type: "bool",
        },
        {
          display: [
            {
              locale: "en",
              name: "Age Over 13",
            },
          ],
          mandatory: false,
          path: ["eu.europa.ec.av.1", "age_over_13"],
          value_type: "bool",
        },
      ],
      credential_signing_alg_values_supported: ["ES256"],
      cryptographic_binding_methods_supported: ["jwk", "cose_key"],
      display: [
        {
          locale: "en",
          logo: {
            alt_text: "A square figure of a Proof of Age",
            uri: "https://examplestate.com/public/pid.png",
          },
          name: "Proof of Age",
        },
      ],
      doctype: "eu.europa.ec.av.1",
      format: "mso_mdoc",
      proof_types_supported: {
        jwt: {
          proof_signing_alg_values_supported: ["ES256"],
        },
      },
      scope: "eu.europa.ec.eudi.age_verification_mdoc",
    },
  },
  credential_endpoint: "https://issuer.ageverification.dev/credential",
  credential_issuer: "https://issuer.ageverification.dev",
  credential_response_encryption: {
    alg_values_supported: ["RSA1_5", "RSA-OAEP", "RSA-OAEP-256", "ECDH-ES"],
    enc_values_supported: [
      "A128CBC-HS256",
      "A192CBC-HS384",
      "A256CBC-HS512",
      "A128GCM",
      "A192GCM",
      "A256GCM",
    ],
    encryption_required: false,
  },
  deferred_credential_endpoint:
    "https://issuer.ageverification.dev/deferred_credential",
  display: [
    {
      locale: "en",
      logo: {
        alt_text: "EU Digital Identity Wallet Logo",
        uri: "https://issuer.ageverification.dev/ic-logo.png",
      },
      name: "Age Verification Issuer",
    },
  ],
  nonce_endpoint: "https://issuer.ageverification.dev/nonce",
  notification_endpoint: "https://issuer.ageverification.dev/notification",
};

export const mockedOauthServerConfig = {
  authorization_endpoint: "https://issuer.ageverification.dev/authorizationV3",
  backchannel_logout_session_required: true,
  backchannel_logout_supported: true,
  claims_parameter_supported: true,
  code_challenge_methods_supported: ["S256"],
  credential_endpoint: "https://issuer.ageverification.dev/credential",
  end_session_endpoint: "https://issuer.ageverification.dev/session",
  frontchannel_logout_session_required: true,
  frontchannel_logout_supported: true,
  grant_types_supported: [
    "authorization_code",
    "implicit",
    "urn:ietf:params:oauth:grant-type:jwt-bearer",
    "refresh_token",
  ],
  id_token_signing_alg_values_supported: [
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "PS256",
    "PS384",
    "PS512",
    "HS256",
    "HS384",
    "HS512",
  ],
  introspection_endpoint: "https://issuer.ageverification.dev/introspection",
  issuer: "https://issuer.ageverification.dev",
  jwks_uri: "https://issuer.ageverification.dev/static/jwks.json",
  pushed_authorization_request_endpoint:
    "https://issuer.ageverification.dev/pushed_authorizationv2",
  registration_endpoint: "https://issuer.ageverification.dev/registration",
  request_object_signing_alg_values_supported: [
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "HS256",
    "HS384",
    "HS512",
    "PS256",
    "PS384",
    "PS512",
  ],
  request_parameter_supported: true,
  request_uri_parameter_supported: true,
  require_request_uri_registration: false,
  response_modes_supported: ["query", "fragment", "form_post"],
  response_types_supported: ["code"],
  scopes_supported: ["openid"],
  subject_types_supported: ["public", "pairwise"],
  token_endpoint: "https://issuer.ageverification.dev/token",
  token_endpoint_auth_methods_supported: ["public"],
  userinfo_endpoint: "https://issuer.ageverification.dev/userinfo",
  userinfo_signing_alg_values_supported: [
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "PS256",
    "PS384",
    "PS512",
    "HS256",
    "HS384",
    "HS512",
  ],
  version: "3.0",
};

export const mockedOpenIdConfiguration = {
  authorization_endpoint: "https://issuer.ageverification.dev/authorizationV3",
  backchannel_logout_session_required: true,
  backchannel_logout_supported: true,
  claims_parameter_supported: true,
  code_challenge_methods_supported: ["S256"],
  credential_endpoint: "https://issuer.ageverification.dev/credential",
  end_session_endpoint: "https://issuer.ageverification.dev/session",
  frontchannel_logout_session_required: true,
  frontchannel_logout_supported: true,
  grant_types_supported: [
    "authorization_code",
    "implicit",
    "urn:ietf:params:oauth:grant-type:jwt-bearer",
    "refresh_token",
  ],
  id_token_signing_alg_values_supported: [
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "PS256",
    "PS384",
    "PS512",
    "HS256",
    "HS384",
    "HS512",
  ],
  introspection_endpoint: "https://issuer.ageverification.dev/introspection",
  issuer: "https://issuer.ageverification.dev",
  jwks_uri: "https://issuer.ageverification.dev/static/jwks.json",
  pushed_authorization_request_endpoint:
    "https://issuer.ageverification.dev/pushed_authorizationv2",
  registration_endpoint: "https://issuer.ageverification.dev/registration",
  request_object_signing_alg_values_supported: [
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "HS256",
    "HS384",
    "HS512",
    "PS256",
    "PS384",
    "PS512",
  ],
  request_parameter_supported: true,
  request_uri_parameter_supported: true,
  require_request_uri_registration: false,
  response_modes_supported: ["query", "fragment", "form_post"],
  response_types_supported: ["code"],
  scopes_supported: ["openid"],
  subject_types_supported: ["public", "pairwise"],
  token_endpoint: "https://issuer.ageverification.dev/token",
  token_endpoint_auth_methods_supported: ["public"],
  userinfo_endpoint: "https://issuer.ageverification.dev/userinfo",
  userinfo_signing_alg_values_supported: [
    "RS256",
    "RS384",
    "RS512",
    "ES256",
    "ES384",
    "ES512",
    "PS256",
    "PS384",
    "PS512",
    "HS256",
    "HS384",
    "HS512",
  ],
  version: "3.0",
};

export const mockedKeys = {
  keys: [
    {
      kty: "RSA",
      use: "sig",
      kid: "andTMHFPNUxuZVh2MHV2MmwtcWZQdGpmSWhHTE9idGx0akJGbFlfaVZHOA",
      n: "2fv0MmYjq_bxG4Cc0PRapFjEmuaBd-Lw7xLgR-252ZUPbbSBjX94_KMfS-orQJ_B3BzbGhKBbH6xJZt5CIb1KRpUrQ7pr-A_eO68FxsgXqbp4wqoHscqLh7EQiMIORiaNlDsCHFXmRyRq9opctbABlgCItEIGgV5K7lXcA-_ZYB6iluHd8dsQFP2P7H1_fytqHZoVpnnlBBtVqaK_fPeX6O3dGmzP0Th5cp_Omnxnr-Sg-Zkbb8eCvQa5LGKv8wHheeLzScfY1E6ll2W3vsOtvNlvCtVYh9ZchDvRWpM8sdPTz8tj5xohKW_BLCqOli8Fbx-uLElpwiy2bpC8OFIQQ",
      e: "AQAB",
    },
    {
      kty: "EC",
      use: "sig",
      kid: "MmZHSC14RXp5TTB5d0tuQ19kQXVrSVVKRWJzUVI5eDBzQi1wVnAwU0h2bw",
      crv: "P-256",
      x: "Q42rGKKOWQXyd1a1UpuZ7HOwI6Qmh0So6XNha4FZ3p4",
      y: "CNIlLsXMps61l1rEXi-WFxrD59870OuPny94czFASSo",
    },
  ],
};

export const expectedResult = {
  issuerConf: {
    batch_size : 30,
    credential_configurations_supported: {
      "eu.europa.ec.eudi.age_verification_mdoc": {
        claims: {
          "eu.europa.ec.av.1": {
            age_over_18: {
              mandatory: true,
              display: [
                {
                  locale: "en",
                  name: "Age Over 18",
                },
              ],
            },
            age_over_13: {
              mandatory: false,
              display: [
                {
                  locale: "en",
                  name: "Age Over 13",
                },
              ],
            },
          },
        },
        cryptographic_binding_methods_supported: ["jwk", "cose_key"],
        display: [
          {
            locale: "en",
            logo: {
              alt_text: "A square figure of a Proof of Age",
              uri: "https://examplestate.com/public/pid.png",
            },
            name: "Proof of Age",
          },
        ],
        format: "mso_mdoc",
        scope: "eu.europa.ec.eudi.age_verification_mdoc",
      },
    },
    authorization_endpoint:
      "https://issuer.ageverification.dev/authorizationV3",
    token_endpoint: "https://issuer.ageverification.dev/token",
    credential_endpoint: "https://issuer.ageverification.dev/credential",
    keys: [
      {
        kty: "RSA",
        use: "sig",
        kid: "andTMHFPNUxuZVh2MHV2MmwtcWZQdGpmSWhHTE9idGx0akJGbFlfaVZHOA",
        n: "2fv0MmYjq_bxG4Cc0PRapFjEmuaBd-Lw7xLgR-252ZUPbbSBjX94_KMfS-orQJ_B3BzbGhKBbH6xJZt5CIb1KRpUrQ7pr-A_eO68FxsgXqbp4wqoHscqLh7EQiMIORiaNlDsCHFXmRyRq9opctbABlgCItEIGgV5K7lXcA-_ZYB6iluHd8dsQFP2P7H1_fytqHZoVpnnlBBtVqaK_fPeX6O3dGmzP0Th5cp_Omnxnr-Sg-Zkbb8eCvQa5LGKv8wHheeLzScfY1E6ll2W3vsOtvNlvCtVYh9ZchDvRWpM8sdPTz8tj5xohKW_BLCqOli8Fbx-uLElpwiy2bpC8OFIQQ",
        e: "AQAB",
      },
      {
        kty: "EC",
        use: "sig",
        kid: "MmZHSC14RXp5TTB5d0tuQ19kQXVrSVVKRWJzUVI5eDBzQi1wVnAwU0h2bw",
        crv: "P-256",
        x: "Q42rGKKOWQXyd1a1UpuZ7HOwI6Qmh0So6XNha4FZ3p4",
        y: "CNIlLsXMps61l1rEXi-WFxrD59870OuPny94czFASSo",
      },
    ],
    issuer: "https://issuer.ageverification.dev",
  },
};
