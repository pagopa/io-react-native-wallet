import { generate } from "@pagopa/io-react-native-crypto";
import { SignJWT } from "@pagopa/io-react-native-jwt";

import { createCryptoContextFor } from "../../../utils/crypto";

const timestamp = (future = 0) =>
  Math.round((Date.now() + future * 1000) / 1000);

export const trustAnchorEntityConfiguration = {
  header: {
    alg: "RS256",
    kid: "-r_Ut1wvDzpE27SAjCriV2BHseEpI-JggtDU2oo_4ao",
    typ: "entity-statement+jwt" as const,
  },
  payload: {
    authority_hints: [],
    exp: timestamp(60),
    iat: timestamp(),
    iss: "https://trustanchor.example",
    jwks: {
      keys: [
        {
          alg: "RS256",
          e: "AQAB",
          kid: "-r_Ut1wvDzpE27SAjCriV2BHseEpI-JggtDU2oo_4ao",
          kty: "RSA" as const,
          n: "rwuTfTBfTAoJTFLDqd-NocN88qsxqUrQpqBBDbqCb6fmNLJ1b7uezVLlEuXmc8tAdLNNtb2TZYRvP3vTnRhPTVOdOxJ3uop1U1MmPuxwWjgq-JeONeiAUEaF12G-1f-7PKgul8q91CnKjRhT04XIsG7H7mgVdelpmLGrp-K90lVopYjVizqehqYr9d0WNcKeiDyGpWub6SBUN0Z3ajHw12KJIobpKKtzdEp0j7ZvxndnXN-4z0rR_LK8uoSoYyL5aNZXxZ5pcZ-4rG-4xzsLyMT99GxTiPrPN-lA08EOKM9QZT749Ykac-h9r3q7aL-z2568R901evL9-wgjTCp8NQ",
          use: "sig",
          x5c: ["FAKE_CERT_BASE64"],
        },
        {
          alg: "ES256",
          crv: "P-256",
          kid: "1L_DPQg6F77RwY_TfL3D5OVGd0PwBhT5O8UOYh7V6kc",
          kty: "EC" as const,
          use: "sig",
          x: "fxOz69xflu6gWc85XpDe8CFVKoLT4CjLzpb4NqC5x_U",
          x5c: ["FAKE_CERT_BASE64"],
          y: "RS1IHtb-SoXfbBsiGxRZQSl-l2g7kF39MEqPC0GLOdg",
        },
      ],
    },
    metadata: {
      federation_entity: {
        contacts: ["https://trustanchor.example"],
        federation_fetch_endpoint: "https://trustanchor.example/fetch",
        federation_list_endpoint: "https://trustanchor.example/list",
        homepage_uri: "https://trustanchor.example",
        logo_uri: "https://trustanchor.example",
        organization_name: "trustanchor",
        policy_uri: "https://trustanchor.example",
      },
    },
    sub: "https://trustanchor.example",
  },
};

export const intermediateEntityStatement = {
  header: {
    alg: "RS256",
    kid: trustAnchorEntityConfiguration.payload.jwks.keys[0]?.kid,
    typ: "entity-statement+jwt",
  },
  payload: {
    exp: timestamp(60),
    iat: timestamp(),
    iss: "https://trustanchor.example",
    jwks: {
      keys: [
        {
          alg: "RS256",
          e: "AQAB",
          kid: "-LIeEyrq8QFXR9mUIwsEoO9E0pmw35QVJSicVgwhItE",
          kty: "RSA" as const,
          n: "ssTdWEs7wI1BOmAn4-9YdiEM0X-WQ_LWUGUWRCIzjYfxf-caoNXqbV4OSjCeuctl7MdhvKwUv55GQt0fUzeEkM4IbThTwLOrhUvj5W3GhWv_tR-RFC_s1kX4ud54ThXSM7GlR9EuV6NNpSZHe7R46HESLzd91pTr7K1ZqsOK719qSAWPY8H9e9N4PRJbkVSq4iPvHNkZIqR6-fo8njvOcwC8hSMhMwSLfciPawrJmTlPFzzgo5fctZlnZPpFtrTRC-jh-yNs_V6sRgKR1BMfWoi6fKN3uZ8H5nayb_zysNUM6kOU8f_Ochk4CWGwaJZvPB0WzBM63eoSDE4f55IN1Q",
          use: "sig",
          x5c: ["FAKE_CERT_BASE64"],
        },
      ],
    },
    sub: "https://intermediate.example",
    trust_marks: [{ id: "fsgvsffsd", trust_mark: "ghjadsf" }],
  },
};

export const intermediateEntityConfiguration = {
  header: {
    alg: "RS256",
    kid: intermediateEntityStatement.header.kid,
    typ: "entity-statement+jwt" as const,
  },
  payload: {
    authority_hints: ["https://trustanchor.example"],
    exp: timestamp(60),
    iat: timestamp(),
    iss: "https://intermediate.example",
    jwks: {
      keys: [
        {
          alg: "RS256",
          e: "AQAB",
          kid: intermediateEntityStatement.header.kid || "int-key",
          kty: "RSA" as const,
          n: "dummyIntermediateModulus",
          use: "sig",
          x5c: ["FAKE_CERT_BASE64"],
        },
      ],
    },
    metadata: {
      federation_entity: {
        federation_fetch_endpoint: "https://intermediate.example/fetch",
      },
    },
    sub: "https://intermediate.example",
  },
};

export const leafEntityStatement = {
  header: {
    alg: "RS256",
    kid: intermediateEntityStatement.payload.jwks.keys[0]?.kid,
    typ: "entity-statement+jwt",
  },
  payload: {
    exp: timestamp(60),
    iat: timestamp(),
    iss: "https://intermediate.example",
    jwks: {
      keys: [
        {
          alg: "RS256",
          e: "AQAB",
          kid: "fHuPjwpl8SI383lbj9PmvY7cn-6vCaEfLVVOJ1kDiiM",
          kty: "RSA" as const,
          n: "pI5E4rZBRPo0rjzjJ8Mj6ZGSIdHWXtsQpWw2Ti-hPCJVxeA8_9CLlmP5FQaPYr57CegINxRDxDU_DTNSpU-tY6R0aOv-iUUYIpoLnvVgECrygRxj2w3-0iXgO7IXvpAXu8i7NCJ5s2go_yLaZI1xRPzJyOBEm9VpsMAdFINVFjT-moBgXM5cGTrjfT8EbCiXDfasA8HMOhDYNFNvNKpmoqOum9LA6hceOCsjB0B2qBIS6AQeUEoBPmJVzEcORccAte_hX3r0WVUAhIogX6n2eILi33VTPuBkZ-PyWt6VGy2n9xA8RF0ww8yDhoN5aloEbQDDgMoJcfgvEuoQ20QeQw",
          use: "sig",
          x5c: ["FAKE_CERT_BASE64"],
        },
      ],
    },
    sub: "https://leaf.example",
    trust_marks: [{ id: "fsgvsffsd", trust_mark: "ghjadsf" }],
  },
};

export const leafEntityConfiguration = {
  header: {
    alg: "RS256",
    kid: leafEntityStatement.payload.jwks.keys[0]?.kid,
    typ: "entity-statement+jwt",
  },
  payload: {
    authority_hints: ["https://intermediate.example"],
    exp: timestamp(60),
    iat: timestamp(),
    iss: "https://leaf.example",
    jwks: {
      keys: [
        {
          alg: "RS256",
          e: "AQAB",
          kid: "fHuPjwpl8SI383lbj9PmvY7cn-6vCaEfLVVOJ1kDiiM",
          kty: "RSA" as const,
          n: "pI5E4rZBRPo0rjzjJ8Mj6ZGSIdHWXtsQpWw2Ti-hPCJVxeA8_9CLlmP5FQaPYr57CegINxRDxDU_DTNSpU-tY6R0aOv-iUUYIpoLnvVgECrygRxj2w3-0iXgO7IXvpAXu8i7NCJ5s2go_yLaZI1xRPzJyOBEm9VpsMAdFINVFjT-moBgXM5cGTrjfT8EbCiXDfasA8HMOhDYNFNvNKpmoqOum9LA6hceOCsjB0B2qBIS6AQeUEoBPmJVzEcORccAte_hX3r0WVUAhIogX6n2eILi33VTPuBkZ-PyWt6VGy2n9xA8RF0ww8yDhoN5aloEbQDDgMoJcfgvEuoQ20QeQw",
          use: "sig",
          x5c: ["FAKE_CERT_BASE64"],
        },
      ],
    },
    metadata: {
      federation_entity: {
        contacts: ["https://leaf.example"],
        homepage_uri: "https://leaf.example",
        logo_uri: "https://leaf.example",
        organization_name: "leaf",
        policy_uri: "https://leaf.example",
      },
    },
    sub: "https://leaf.example",
  },
};

// // Encodes a jwt object and append a stub signature
// export const signed = async (jwt: any) => {
//   const keytag = `${Math.random()}`;
//   await generate(keytag);
//   return new SignJWT(createCryptoContextFor(keytag))
//     .setPayload(jwt.payload)
//     .setProtectedHeader(jwt.header)
//     .sign();
// };
