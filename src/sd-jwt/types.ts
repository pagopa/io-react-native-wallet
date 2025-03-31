import { JWK } from "../utils/jwk";
import { z } from "zod";

export const UnixTime = z.number().min(0).max(2147483647000);
export type UnixTime = z.infer<typeof UnixTime>;

export type ObfuscatedDisclosures = z.infer<typeof ObfuscatedDisclosures>;
export const ObfuscatedDisclosures = z.object({ _sd: z.array(z.string()) });

/**
 * A triple of values in the form of {salt, claim name, claim value} that represent a parsed disclosure.
 *
 * @see https://datatracker.ietf.org/doc/html/draft-ietf-oauth-selective-disclosure-jwt-04
 * @see https://vcstuff.github.io/draft-terbu-sd-jwt-vc/draft-terbu-oauth-sd-jwt-vc.html
 */
export type Disclosure = z.infer<typeof Disclosure>;
export const Disclosure = z.tuple([
  /* salt */ z.string(),
  /* claim name */ z.string(),
  /* claim value */ z.unknown(),
]);

/**
 * Encoding depends on the serialization algorithm used when generating the disclosure tokens.
 * The SD-JWT reference itself take no decision about how to handle whitespaces in serialized objects.
 * For such reason, we may find conveninent to have encoded and decode values stored explicitly in the same structure.
 * Please note that `encoded` can always decode into `decode`, but `decode` may or may not be encoded with the same value of `encoded`
 *
 * @see https://www.ietf.org/archive/id/draft-ietf-oauth-selective-disclosure-jwt-05.html#name-disclosures-for-object-prop
 */
export type DisclosureWithEncoded = {
  decoded: Disclosure;
  encoded: string;
};

export type SdJwt4VC = z.infer<typeof SdJwt4VC>;
export const SdJwt4VC = z.object({
  header: z.object({
    typ: z.literal("dc+sd-jwt"),
    alg: z.string(),
    kid: z.string().optional(),
    x5c: z.array(z.string()).optional(),
    vctm: z.array(z.string()).optional(),
  }),
  payload: z.intersection(
    z.object({
      iss: z.string(),
      sub: z.string(),
      iat: UnixTime.optional(),
      exp: UnixTime,
      _sd_alg: z.literal("sha-256"),
      status: z.object({
        status_assertion: z.object({
          credential_hash_alg: z.literal("sha-256"),
        }),
      }),
      cnf: z.object({
        jwk: JWK,
      }),
      vct: z.string().url(),
      "vct#integrity": z.string().optional(),
      issuing_authority: z.string(),
      issuing_country: z.string(),
      // TODO: verification ?
    }),
    ObfuscatedDisclosures
  ),
});

const Verification = z.object({
  trust_framework: z.string(),
  authentic_source: z.object({
    organization_name: z.string(),
    organization_code: z.string(),
    contacts: z.array(z.string()),
    homepage_uri: z.string().url(),
    logo_uri: z.string().url(),
  }),
});

const SvgTemplate = z.object({
  uri: z.string().url(),
  "uri#integrity": z.string(),
  properties: z.object({
    orientation: z.string().url().optional(),
    color_scheme: z.string().optional(),
    contrast: z.string().optional(),
  }),
});

const SimpleRendering = z.object({
  logo: z.object({
    uri: z.string().url(),
    "uri#integrity": z.string(),
    alt_text: z.string().optional(),
  }),
  background_color: z.string().optional(),
  text_color: z.string().optional(),
});

const Display = z.array(
  z.object({
    lang: z.string(),
    name: z.string(),
    description: z.string(),
    rendering: z.object({
      svg_template: z.array(SvgTemplate),
      simple: SimpleRendering.optional(),
    }),
  })
);

const ClaimDisplay = z.array(
  z.object({
    lang: z.string(),
    label: z.string(),
    description: z.string(),
  })
);

const Claims = z.array(
  z.object({
    path: z.array(z.string()),
    display: ClaimDisplay,
    sd: z.enum(["always", "never"]),
    svg_id: z.string(),
  })
);

/**
 * Metadata for a digital credential. This information is retrieved from the URL defined in the `vct` claim.
 *
 * @see https://italia.github.io/eid-wallet-it-docs/v0.9.1/en/pid-eaa-data-model.html#digital-credential-metadata-type
 */
export type TypeMetadata = z.infer<typeof TypeMetadata>;
export const TypeMetadata = z.object({
  name: z.string(),
  description: z.string(),
  extends: z.string().url().optional(),
  "extends#integrity": z.string().optional(),
  schema: z.string().optional(),
  schema_uri: z.string().url().optional(),
  "schema_uri#integrity": z.string().optional(),
  data_source: z.object({
    verification: Verification,
  }),
  display: Display,
  claims: Claims,
});
