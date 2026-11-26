## COSE

This module provides methods to sign and verify data with COSE.

```typescript
import { COSE } from '@io-app-it-wallet/expo-iso18013';
```

### Methods

#### `sign`

Signs base64 encoded data using COSE (CBOR Object Signing and Encryption).
Returns a `Promise` which resolves to a `string` containing the COSE-Sign1 object in base64 encoding or rejects with a `ModuleError` in case of failures.

```typescript
try {
  const coseSign1 = await COSE.sign('base64EncodedData', 'keyTag');
} catch (e) {
  const parsedError = COSE.ModuleErrorSchema.parse(e);
  console.log(parsedError.code, parsedError.message);
}
```

#### `verify`

Verifies a COSE-Sign1 object using the provided public key.
Returns a `Promise` which resolves to a `boolean` indicating if the signature is valid or rejects with a `ModuleError` in case of failures.

```typescript
// public key in JWK format
const publicKey = {
  kty: 'EC',
  crv: 'P-256',
  x: '...',
  y: '...',
};

try {
  const isValid = await COSE.verify('coseSign1Base64Data', publicKey);
} catch (e) {
  const parsedError = COSE.ModuleErrorSchema.parse(e);
  console.log(parsedError.code, parsedError.message);
}
```

### Error

This table contains the list of error codes that can be thrown by the `COSE` module which are mapped via the `ModuleErrorCodes` type:
| Type | Platform | Description |
| -------------------------- | ----------- | ------------------------------------------------------------ |
| SIGN_ERROR | Android/iOS | An error occurred while signing the data |
| VERIFY_ERROR | Android/iOS | An error occurred while verifying the signature |
| THREADING_ERROR | iOS | An error occurred while performing the sign operation in background |

An error can be parsed using the `ModuleErrorSchema` with type `ModuleErrorCodes` exposed by the `COSE` module. The error can be parsed as follows:

```typescript
import { COSE } from '@io-app-it-wallet/expo-iso18013';
try {
  await COSE.func();
} catch (error) {
  const parsedError = COSE.ModuleErrorSchema.parse(error); // Or ModuleErrorSchema.safeParse(error) for safe parsing
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
