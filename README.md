# @pagopa/io-react-native-wallet

Provide data structures, helpers, and API to IO Wallet to obtain and manage Wallet Instance Attestations


## Example app
To test on the example app:

```sh
cd example

# ios
yarn ios

# android
yarn android
```

## Modules

### Wallet Instance Attestation

#### Usage

```ts
import { WalletInstanceAttestation } from "io-react-native-wallet";

WalletInstanceAttestation.decode("<token>");
```

### PID

#### Usage

Module API support [`SD-JWT`](https://italia.github.io/eidas-it-wallet-docs/en/pid-data-model.html#id1)

```ts
import { PID } from "@pagopa/io-react-native-wallet";

#Only for decode
PID.SdJwt.decode("<token>");

#Decode and verification
PID.SdJwt.verify("<token>");

```

