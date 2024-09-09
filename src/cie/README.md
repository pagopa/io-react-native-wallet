# CIE

This library provides a components and a set of utilities to interact with the physical [CIE (Carta d'Identità Elettronica)](https://www.cartaidentita.interno.gov.it/) card. It can be used to [obtain a eID](../credential/issuance/README.md) via strong authentication.
Under the hood it uses [@pagopa/react-native-cie](https://github.com/pagopa/io-cie-sdk) to interact with the card and [react-native-webview](https://github.com/react-native-webview/react-native-webview) to complete the authorization flow.

An example of usage can be found in the [example](./example) folder of this repository.
