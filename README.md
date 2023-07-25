# 🪪 @pagopa/io-react-native-wallet

📲 Provide data structures, helpers, and API to Wallet Instance.

Depends on [@pagopa/io-react-native-jwt](https://github.com/pagopa/io-react-native-jwt)

## Installation

```sh
# First install JWT dependency if you don't have it
npm install @pagopa/io-react-native-jwt

npm install @pagopa/io-react-native-wallet
```

## Usage

### PID

#### Encode and Decode

```ts
import { PID } from "@pagopa/io-react-native-wallet";

//Only for decode
PID.SdJwt.decode("<token>");

//Decode and verification
PID.SdJwt.verify("<token>");

```

### Wallet Instance Attestation

#### Issuing

```ts
import { WalletInstanceAttestation } from "@pagopa/io-react-native-wallet";

const issuing = new WalletInstanceAttestation.Issuing(
    yourWalletProviderUrl
    );

// Generate keys
const publicKey = await yourCustomPublicKey("TEE_KEY_TAG");

const walletInstanceAttestationRequest =
await issuing.getAttestationRequestToSign(
    publicKey
);

//Sign with TEE
const signature = await yourCustomSignatureFunction(
    walletInstanceAttestationRequest,
    "TEE_KEY_TAG"
    );

const walletInstanceAttestation =
await issuing.getAttestation(
    walletInstanceAttestationRequest,
    signature
);

console.log(walletInstanceAttestation);

```

#### Encode and Decode

```ts
import { WalletInstanceAttestation } from "io-react-native-wallet";

WalletInstanceAttestation.decode("<token>");
```

## Example

You can use the [sample app](example) to test and understand how to use the library.

```sh
cd example

yarn install

# To use iOS
yarn ios

# To use Android
yarn android

```
