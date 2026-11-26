# ISO18013-7

This library provides a React Native module based on [iso18013-android](https://github.com/pagopa/iso18013-android) and [iso18013-ios](https://github.com/pagopa/iso18013-ios) which allows mDL remote presentation according to the ISO 18013-7 standard.

```typescript
import { ISO18013_7 } from '@io-app-it-wallet/expo-iso18013';
```

## Methods

#### `generateOID4VPDeviceResponse`

Returns a base64-encoded string containing the CBOR of the **Device Response** object.

Uses the OpenID4VP 1.0 session transcript. The fourth argument replaces the former
`mdocGeneratedNonce`: pass the base64url-encoded SHA-256 JWK thumbprint (RFC 7638)
of the verifier key actually used to encrypt the authorization response, or `null`
when the response is not encrypted. The native bridge decodes the thumbprint to
32 bytes; do not pass the old nonce or a JWK JSON string. Include the client ID
prefix in `clientId`.

This is a breaking change for callers using the previous draft transcript.

```typescript
import { ISO18013_7 } from '@io-app-it-wallet/expo-iso18013';

const documents = [
  {
    issuerSignedContent: 'base64url-or-base64-encoded-content',
    alias: 'key-alias',
    docType: 'docType',
  },
];

const acceptedFields = {
  'org.iso.18013.5.1.mDL': {
    'org.iso.18013.5.1': {
      hair_colour: true,
      given_name_national_character: true,
      family_name_national_character: true,
      given_name: true,
    },
  },
};

// For an unencrypted response; otherwise supply the encryption key thumbprint.
const jwkThumbprint = null;

const result = await ISO18013_7.generateOID4VPDeviceResponse(
  clientId,
  responseUri,
  authorizationRequestNonce,
  jwkThumbprint,
  documents,
  acceptedFields
);
```

## Errors

This table contains the list of error codes that can be thrown by the `ISO18013_7` module which are mapped via the `ModuleErrorCodes` type:

| Type                           | Platform    | Description                                     |
| ------------------------------ | ----------- | ----------------------------------------------- |
| GENERATE_OID4VP_RESPONSE_ERROR | Android/iOS | An error occurred while generating the response |

An error can be parsed using the `ModuleErrorSchema` with type `ModuleErrorCodes` exposed by the `ISO18013_7` module. The error can be parsed as follows:

```typescript
import { ISO18013_7 } from '@io-app-it-wallet/expo-iso18013';
try {
  await ISO18013_7.func();
} catch (error) {
  const parsedError = ISO18013_7.ModuleErrorSchema.parse(error); // Or ModuleErrorSchema.safeParse(error) for safe parsing
  console.log(JSON.stringify(parsedError, null, 2));
}
```

The parsed object will contain properties from both iOS and Android platforms:

```typescript
{
  code: string; // Defined in ModuleErrorCodes
  message: string;
  name: string;
  userInfo?: Record<string, any> | null;
  nativeStackAndroid?: Array<{
    lineNumber: number;
    file: string | null
    methodName: string;
    class: string;
  }>;
  domain?: string;
  nativeStackIOS?: Array<string>;
};
```
