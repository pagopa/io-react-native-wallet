# Example app

The example app is an Expo React Native application used to develop and test
the libraries contained in this monorepo.

## Prerequisites
Follow the [React Native environment setup guide for your OS](https://reactnative.dev/docs/environment-setup?guide=native) before proceeding. Run the following commands from the monorepo root through Nx.

## Generate the API definition

Generate the wallet-provider API client before running the example app, and again
whenever its OpenAPI specification changes:

```sh
pnpm nx run io-react-native-wallet:generate
```

## Generate the native projects via Expo CNG

This must be run the first time the app is set up, or after changes to the
[`app.json`](app.json) configuration file or native dependencies.

```sh
pnpm nx run example-app:prebuild --clean
```

## Run the app

```sh
pnpm nx run example-app:run-ios
pnpm nx run example-app:run-android
```

To start Metro directly:

```sh
cd apps/example-app
pnpm exec expo start --dev-client --host lan --port 8081
```

## Test Expo ISO 18013

Open the app, log in or choose **Skip login**, then select **Expo ISO 18013**
from the wallet home. The screen can decode CBOR, sign and verify COSE data,
start a QR/BLE engagement, and generate an ISO 18013-7 device response.
The default CBOR input decodes to `{"a":1}`. Signing requires an existing
hardware key tag; verification requires a matching public JWK. Remote responses
require valid credentials, key aliases and accepted fields in JSON.

QR/BLE testing requires a physical device, Bluetooth permissions and a
compatible verifier. The standalone screen starts engagement without verifier
trust certificates and displays requests; it does not send a presentation
response. Use the wallet proximity flow for an end-to-end presentation.
iOS device builds additionally require a provisioning profile with the app's
configured App Attest and NFC capabilities. NFC and Bluetooth behavior cannot
be verified fully on a simulator.