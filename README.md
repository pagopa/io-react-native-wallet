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

const issuing = new WalletInstanceAttestation.Issuing(yourWalletProviderUrl);

// Generate keys
const publicKey = await yourCustomPublicKey("TEE_KEY_TAG");

const walletInstanceAttestationRequest =
  await issuing.getAttestationRequestToSign(publicKey);

//Sign with TEE
const signature = await yourCustomSignatureFunction(
  walletInstanceAttestationRequest,
  "TEE_KEY_TAG"
);

const walletInstanceAttestation = await issuing.getAttestation(
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

### NodeJS and Ruby

To run the example project you need to install the correct version of NodeJS and Ruby.
We recommend the use of a virtual environment of your choice. For ease of use, this guide adopts [nodenv](https://github.com/nodenv/nodenv) for NodeJS, [rbenv](https://github.com/rbenv/rbenv) for Ruby.

The node version used in this project is stored in [example/.node-version](example/.node-version),
while the version of Ruby is stored in [example/.ruby-version](.ruby-version).

### React Native

Follow the [official tutorial](https://reactnative.dev/docs/environment-setup?guide=native) for installing the `React Native CLI` for your operating system.

If you have a macOS system, you can follow both the tutorial for iOS and for Android. If you have a Linux or Windows system, you only need to install the development environment for Android.

### Build the app

In order to build the app, we use [yarn](https://yarnpkg.com/) for managing javascript dependencies.
As stated [previously](#nodejs-and-ruby), we also use `nodenv` and `rbenv` for managing the environment:

```bash
# Clone the repository
$ git clone https://github.com/pagopa/io-react-native-wallet

# CD into the repository
$ cd io-react-native-wallet/example

# Install NodeJS with nodenv, the returned version should match the one in the .node-version file
$ nodenv install && nodenv version

# Install Ruby with rbenv, the returned version should match the one in the .ruby-version file
$ rbenv install && rbenv version

# Install yarn and rehash to install shims
$ npm install -g yarn && nodenv rehash

# Install bundle
$ gem install bundle

# Install the required Gems from the Gemfile
# Run this only during the first setup and when Gems dependencies change
$ bundle install

# Install example dependencies
# Run this only during the first setup and when JS dependencies change
$ yarn install

# Install library dependencies
$ cd .. && yarn install && cd io-react-native-wallet/example

# Install podfiles when targeting iOS (ignore this step for Android)
# Run this only during the first setup and when Pods dependencies change
$ cd iOS && bundle exec pod install && cd ..

# Run the app on iOS
$ yarn ios

# Run the app on Android
$ yarn android
```
