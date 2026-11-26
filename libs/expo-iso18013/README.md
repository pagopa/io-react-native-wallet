# @io-app-it-wallet/expo-iso18013

Expo module for ISO 18013-5 proximity presentation, ISO 18013-7 remote
presentation, CBOR decoding, and COSE signing and verification. Migrated from
the MIT-licensed `@pagopa/io-react-native-iso18013`.

The module requires Expo, React Native and `@pagopa/io-react-native-crypto`.
Native projects must be rebuilt after adding it; it cannot run in Expo Go.

The existing JavaScript APIs remain available:

- [ISO 18013-5](src/iso18013/iso18013-5/README.md)
- [ISO 18013-7](src/iso18013/iso18013-7/README.md)
- [CBOR](src/cbor/cbor/README.md)
- [COSE](src/cbor/cose/README.md)

Register proximity event listeners before calling `startEngagement`, and remove
them and close the engagement when finished.

See the [example app](../../apps/example-app/README.md) for running the module.

## License

MIT. See [LICENSE](LICENSE).
