## Example

This example app demonstrates how to use the `io-react-native-wallet` library to interact with the IO Wallet.
Currently it must be run on a **physical device**, as the library uses native code to generate hardware attestations, integrity tokens and cryptographic keys. These features are only partially available or not available at all on Android emulators and iOS simulators.

In order to create a wallet instance and get an attestation, you must login with SPID credentials to [IO backend](https://github.com/pagopa/io-backend). Thus a valid session is required, mimicking what happens in [io-app](https://github.com/pagopa/io-app).

The app supports the hotswap between PRE and PROD environments. The default environment is PROD, but it can be changed in the app settings. The environment variables required are contained in the [.env.example](./env.example) file.

### NodeJS and Ruby

To run the example project you need to install the correct version of NodeJS and Ruby.
We recommend the use of a virtual environment of your choice. For ease of use, this guide adopts [nodenv](https://github.com/nodenv/nodenv) or [nvm](https://github.com/nvm-sh/nvm) for NodeJS and [rbenv](https://github.com/rbenv/rbenv) for Ruby.
[Yarn](https://yarnpkg.com/) is the package manager of choice.

The node version used in this project is stored in [example/.node-version](example/.node-version) and [example/.nvmrc],
while the version of Ruby is stored in [example/.ruby-version](.ruby-version).

### React Native

Follow the [official tutorial](https://reactnative.dev/docs/environment-setup?guide=native) for installing the `React Native CLI` for your operating system.

If you have a macOS system, you can follow both the tutorial for iOS and for Android. If you have a Linux or Windows system, you only need to install the development environment for Android.

### Dependencies

The whole app is built with simplicity in mind and it's based on [Redux Toolkit](https://redux-toolkit.js.org/) for state management along with Redux Thunk which is the default middleware for managing async operations.
The app also uses [React Navigation](https://reactnavigation.org/) for navigation and [io-app-design-system](https://github.com/pagopa/io-app-design-system) for the UI components.

In ordero to implement `io-react-native-wallet` flows, the example apps uses the following libraries:

- [io-react-native-crypto](https://github.com/pagopa/io-react-native-crypto) to generate and sign cryptographic keys hardware-backed;

### Build the app

In order to build the app, as stated [previously](#nodejs-and-ruby), we also use `nodenv` and `rbenv` for managing the environment:

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

# Copy the .env.example file to .env and fill in the required values
$ cp .env.example .env

# Run the app on iOS (make sure to point to a physical device)
$ yarn ios

# Run the app on Android (make sure to point to a physical device)
$ yarn android
```

### CIE L3

The example app supports the CIE L3 authentication flow via [@pagopa/react-native-cie"](https://github.com/pagopa/io-cie-sdk). Android is supported out of the box, however In order to test it on iOS, you need to install the CIE SDK:

```bash
$ yarn cie-ios:prod
$ cd ios && bundle exec pod install && cd ..
```
