# CBOR

This module provides methods to decode CBOR data into readable objects.

```typescript
import { CBOR } from '@io-app-it-wallet/expo-iso18013';
```

## Methods

#### `decode`

Decodes CBOR data into readable JSON objects.

**Note**: this method does not decode nested CBOR objects and therefore complex objects needs additional manual decoding

```typescript
const decoded = await CBOR.decode('...');
```

#### `decodeDocuments`

Decodes CBOR data containing MDOC objects.

```typescript
const decoded = await CBOR.decodeDocuments('...');
```

#### `decodeIssuerSigned`

Decodes CBOR data containing an Issuer Signed object.

```typescript
const decoded = await CBOR.decodeIssuerSigned('...');
```

## Errors

This table contains the list of error codes that can be thrown by the `CBOR` module which are mapped via the `ModuleErrorCodes` type:
| Type | Platform | Description |
| -------------------------- | ----------- | ------------------------------------------------------------ |
| DECODE_ERROR | Android/iOS | An error occurred while decoding the CBOR |
| DECODE_DOCUMENTS_ERROR | Android/iOS | An error occurred while decoding a CBOR mDOC |
| DECODE_ISSUER_SIGNED_ERROR | Android/iOS | An error occurred while decoding a CBOR Issuer Signed object |
| EUNSPECIFIED               | Android     | Default error when no other error is specified               |

An error can be parsed using the `ModuleErrorSchema` with type `ModuleErrorCodes` exposed by the `CBOR` module. The error can be parsed as follows:

```typescript
import { CBOR } from '@io-app-it-wallet/expo-iso18013';
try {
  await CBOR.func();
} catch (error) {
  const parsedError = CBOR.ModuleErrorSchema.parse(error); // Or ModuleErrorSchema.safeParse(error) for safe parsing
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
