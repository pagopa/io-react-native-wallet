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

Refer to Example App for actual usages.

<details>
  <summary>Handling cryptographic assets</summary>

User flows implementions make use of tokens signed using asymmetric key pairs. Such cryptographic keys are managed by the device according to its specifications. It's not the intention of this package to handle such cryptographic assets and their peculiarities; instead, an handy interface is used to provide the right abstraction to allow responsibilities segregation:

- the application knows who to generate/store/delete keys;
- the package knows when and where to use them.

The interface is `CryptoContext` inherited from the `@pagopa/io-react-native-jwt` package.

This package provides an helper to build a `CryptoContext` object bound to a given key tag

```ts
import { createCryptoContextFor } from "@pagopa/io-react-native-wallet";

const ctx = createCryptoContextFor("my-tag");
```

Be sure the key for `my-tag` already exists.

</details>

<details>
  <summary>Making HTTP requests</summary>

This package is compatibile with any http client which implements [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API). Functions that makes http requests allow for an optional `appFetch` parameter to provide a custom http client implementation. If not provided, the built-in implementation on the runtime is used.

</details>

### PID

#### Issuing

```ts
import { PID, createCryptoContextFor } from "@pagopa/io-react-native-wallet";

// Obtain PID metadata
const pidEntityConfiguration = await PID.Issuing.getEntityConfiguration()(
  pidProviderBaseUrl
);

// Auth Token request
const authRequest = PID.Issuing.authorizeIssuing({ wiaCryptoContext });
const authConf = await authRequest(
  instanceAttestation,
  walletProviderBaseUrl,
  pidEntityConfiguration
);

// Credential request
const credentialRequest = PID.Issuing.getCredential({ pidCryptoContext });
const pid = await credentialRequest(authConf, pidEntityConfiguration, {
  birthDate: "01/01/1990",
  fiscalCode: "AAABBB00A00A000A",
  name: "NAME",
  surname: "SURNAME",
});
```

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
import {
  WalletInstanceAttestation,
  createCryptoContextFor,
} from "@pagopa/io-react-native-wallet";
// create crypto contet
const wiaCryptoContext = createCryptoContextFor("wia-keytag");

// prepare the request
const wiaRequest = WalletInstanceAttestation.getAttestation({
  wiaCryptoContext,
});

// request
const instanceAttestation = await wiaRequest("https://wallet-provider.example");
```

#### Encode and Decode

```ts
import { WalletInstanceAttestation } from "io-react-native-wallet";

WalletInstanceAttestation.decode("<token>");
```

### Relying Party

#### Credential presentation

```ts
import { PID, createCryptoContextFor } from "@pagopa/io-react-native-wallet";

// get request object
const getRequestObject = RelyingPartySolution.getRequestObject({
  wiaCryptoContext,
});
const requestObj = await getRequestObject(
  walletInstanceAttestation,
  authRequestUrl,
  entityConfiguration
);

// Submit authorization response
const sendAuthorizationResponse =
  RelyingPartySolution.sendAuthorizationResponse({
    pidCryptoContext,
  });
const result = await sendAuthorizationResponse(requestObj, [pidToken, claims]);
```

## Example

### NodeJS and Ruby

To run the example project you need to install the correct version of NodeJS and Ruby.
We recommend the use of a virtual environment of your choice. For ease of use, this guide adopts [nodenv](https://github.com/nodenv/nodenv) or [nvm](https://github.com/nvm-sh/nvm) for NodeJS and [rbenv](https://github.com/rbenv/rbenv) for Ruby.
[Yarn](https://yarnpkg.com/) is the package manager of choice.

The node version used in this project is stored in [example/.node-version](example/.node-version) and [example/.nvmrc],
while the version of Ruby is stored in [example/.ruby-version](.ruby-version).

### React Native

Follow the [official tutorial](https://reactnative.dev/docs/environment-setup?guide=native) for installing the `React Native CLI` for your operating system.

If you have a macOS system, you can follow both the tutorial for iOS and for Android. If you have a Linux or Windows system, you only need to install the development environment for Android.

### Build the app

In order to build the app,
As stated [previously](#nodejs-and-ruby), we also use `nodenv` and `rbenv` for managing the environment:

```bash
# Clone the repository
$ git clone https://github.com/pagopa/io-react-native-wallet

# CD into the repository
$ cd io-react-native-wallet

# Install library dependencies
$ yarn install

# CD into the example folder
$ cd example

# Install bundle
$ gem install bundle

# Install the required Gems from the Gemfile
# Run this only during the first setup and when Gems dependencies change
$ bundle install

# Install example dependencies
# Run this only during the first setup and when JS dependencies change
$ yarn install

# Install podfiles when targeting iOS (ignore this step for Android)
# Run this only during the first setup and when Pods dependencies change
$ cd ios && bundle exec pod install && cd ..

# Run the app on iOS
$ yarn ios

# Run the app on Android
$ yarn android
```
