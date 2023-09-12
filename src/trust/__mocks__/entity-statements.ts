import { SignJWT } from "@pagopa/io-react-native-jwt";

const timestamp = (future: number = 0) =>
  Math.round((Date.now() + future * 1000) / 1000);

export const trustAnchorEntityConfiguration = {
  header: {
    typ: "entity-statement+jwt" as const,
    alg: "RS256",
    kid: "-r_Ut1wvDzpE27SAjCriV2BHseEpI-JggtDU2oo_4ao",
  },
  payload: {
    iss: "https://trustanchor.example",
    sub: "https://trustanchor.example",
    iat: timestamp(),
    exp: timestamp(60),
    jwks: {
      keys: [
        {
          kty: "RSA" as const,
          e: "AQAB",
          use: "sig",
          kid: "-r_Ut1wvDzpE27SAjCriV2BHseEpI-JggtDU2oo_4ao",
          alg: "RS256",
          n: "rwuTfTBfTAoJTFLDqd-NocN88qsxqUrQpqBBDbqCb6fmNLJ1b7uezVLlEuXmc8tAdLNNtb2TZYRvP3vTnRhPTVOdOxJ3uop1U1MmPuxwWjgq-JeONeiAUEaF12G-1f-7PKgul8q91CnKjRhT04XIsG7H7mgVdelpmLGrp-K90lVopYjVizqehqYr9d0WNcKeiDyGpWub6SBUN0Z3ajHw12KJIobpKKtzdEp0j7ZvxndnXN-4z0rR_LK8uoSoYyL5aNZXxZ5pcZ-4rG-4xzsLyMT99GxTiPrPN-lA08EOKM9QZT749Ykac-h9r3q7aL-z2568R901evL9-wgjTCp8NQ",
        },
        {
          kty: "EC" as const,
          use: "sig",
          crv: "P-256",
          kid: "1L_DPQg6F77RwY_TfL3D5OVGd0PwBhT5O8UOYh7V6kc",
          x: "fxOz69xflu6gWc85XpDe8CFVKoLT4CjLzpb4NqC5x_U",
          y: "RS1IHtb-SoXfbBsiGxRZQSl-l2g7kF39MEqPC0GLOdg",
          alg: "ES256",
        },
      ],
    },
    metadata: {
      federation_entity: {
        organization_name: "trustanchor",
        homepage_uri: "https://trustanchor.example",
        policy_uri: "https://trustanchor.example",
        logo_uri: "https://trustanchor.example",
        contacts: ["https://trustanchor.example"],
      },
    },
    authority_hints: [],
  },
};

export const intermediateEntityStatement = {
  header: {
    typ: "entity-statement+jwt",
    alg: "RS256",
    kid: trustAnchorEntityConfiguration.payload.jwks.keys[0]?.kid,
  },
  payload: {
    iss: "https://trustanchor.example",
    sub: "https://intermediate.example",
    jwks: {
      keys: [
        {
          kty: "RSA" as const,
          e: "AQAB",
          use: "sig",
          kid: "-LIeEyrq8QFXR9mUIwsEoO9E0pmw35QVJSicVgwhItE",
          alg: "RS256",
          n: "ssTdWEs7wI1BOmAn4-9YdiEM0X-WQ_LWUGUWRCIzjYfxf-caoNXqbV4OSjCeuctl7MdhvKwUv55GQt0fUzeEkM4IbThTwLOrhUvj5W3GhWv_tR-RFC_s1kX4ud54ThXSM7GlR9EuV6NNpSZHe7R46HESLzd91pTr7K1ZqsOK719qSAWPY8H9e9N4PRJbkVSq4iPvHNkZIqR6-fo8njvOcwC8hSMhMwSLfciPawrJmTlPFzzgo5fctZlnZPpFtrTRC-jh-yNs_V6sRgKR1BMfWoi6fKN3uZ8H5nayb_zysNUM6kOU8f_Ochk4CWGwaJZvPB0WzBM63eoSDE4f55IN1Q",
        },
      ],
    },
    trust_marks: [{ id: "fsgvsffsd", trust_mark: "ghjadsf" }],
    iat: timestamp(),
    exp: timestamp(60),
  },
};

export const leafEntityStatement = {
  header: {
    typ: "entity-statement+jwt",
    alg: "RS256",
    kid: intermediateEntityStatement.payload.jwks.keys[0]?.kid,
  },
  payload: {
    iss: "https://intermediate.example",
    sub: "https://leaf.example",
    jwks: {
      keys: [
        {
          kty: "RSA" as const,
          e: "AQAB",
          use: "sig",
          kid: "fHuPjwpl8SI383lbj9PmvY7cn-6vCaEfLVVOJ1kDiiM",
          alg: "RS256",
          n: "pI5E4rZBRPo0rjzjJ8Mj6ZGSIdHWXtsQpWw2Ti-hPCJVxeA8_9CLlmP5FQaPYr57CegINxRDxDU_DTNSpU-tY6R0aOv-iUUYIpoLnvVgECrygRxj2w3-0iXgO7IXvpAXu8i7NCJ5s2go_yLaZI1xRPzJyOBEm9VpsMAdFINVFjT-moBgXM5cGTrjfT8EbCiXDfasA8HMOhDYNFNvNKpmoqOum9LA6hceOCsjB0B2qBIS6AQeUEoBPmJVzEcORccAte_hX3r0WVUAhIogX6n2eILi33VTPuBkZ-PyWt6VGy2n9xA8RF0ww8yDhoN5aloEbQDDgMoJcfgvEuoQ20QeQw",
        },
      ],
    },
    trust_marks: [{ id: "fsgvsffsd", trust_mark: "ghjadsf" }],
    iat: timestamp(),
    exp: timestamp(60),
  },
};

export const leafEntityConfiguration = {
  header: {
    typ: "entity-statement+jwt",
    alg: "RS256",
    kid: leafEntityStatement.payload.jwks.keys[0]?.kid,
  },
  payload: {
    iss: "https://leaf.example",
    sub: "https://leaf.example",
    jwks: {
      keys: [
        {
          kty: "RSA" as const,
          e: "AQAB",
          use: "sig",
          kid: "fHuPjwpl8SI383lbj9PmvY7cn-6vCaEfLVVOJ1kDiiM",
          alg: "RS256",
          n: "pI5E4rZBRPo0rjzjJ8Mj6ZGSIdHWXtsQpWw2Ti-hPCJVxeA8_9CLlmP5FQaPYr57CegINxRDxDU_DTNSpU-tY6R0aOv-iUUYIpoLnvVgECrygRxj2w3-0iXgO7IXvpAXu8i7NCJ5s2go_yLaZI1xRPzJyOBEm9VpsMAdFINVFjT-moBgXM5cGTrjfT8EbCiXDfasA8HMOhDYNFNvNKpmoqOum9LA6hceOCsjB0B2qBIS6AQeUEoBPmJVzEcORccAte_hX3r0WVUAhIogX6n2eILi33VTPuBkZ-PyWt6VGy2n9xA8RF0ww8yDhoN5aloEbQDDgMoJcfgvEuoQ20QeQw",
        },
      ],
    },
    metadata: {},
    authority_hints: [],
    iat: timestamp(),
    exp: timestamp(60),
  },
};

// Encodes a jwt object and appena a stub signature
export const signed = (jwt: any) =>
  SignJWT.appendSignature(
    new SignJWT(jwt.payload).setProtectedHeader(jwt.header).toSign(),
    "signature"
  );
