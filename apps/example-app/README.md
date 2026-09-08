# Example app

The example app is an Expo React Native application used to develop and test
the libraries contained in this monorepo.

## Prerequisites
Follow the [React Native environment setup guide for your OS](https://reactnative.dev/docs/environment-setup?guide=native) before proceeding.
Run the following commands from the monorepo root through Nx.


## Generate the native projects via Expo CNG. 
This must be run the first time the app is set up, or after changes to the [`app.json`](app.json) configuration file.

```sh
pnpm nx run example-app:prebuild --clean
```


## Run the app

```sh
pnpm nx run example-app:run-ios
pnpm nx run example-app:run-android
```