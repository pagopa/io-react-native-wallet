# io-react-native-wallet

Provide data structures, helpers, and API to IO Wallet to obtain and manage Wallet Instance Attestations


## Example app
To test on the example app:

```sh
# ios
yarn example ios

# android
yarn example android
```

## Modules

### PID

#### Usage
Module API support both [`SD-JWT`](https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html#id1) and [`MDOC-CBOR`](https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html#mdoc-cbor).

```ts
import { PID } from "io-react-native-wallet";

PID.SdJwt.decode("<token>");

PID.MDocCbor.decode("<token>"); // to be implemented yet
```



---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
