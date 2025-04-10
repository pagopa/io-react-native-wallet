## Example

This debug logging server can be used along with the [example app](./example) to receive log messages from the library implementation.

### NodeJS

To run the example project you need to install the correct version of NodeJS.
We recommend the use of a virtual environment of your choice. For ease of use, this guide adopts [nodenv](https://github.com/nodenv/nodenv) or [nvm](https://github.com/nvm-sh/nvm) for NodeJS.
[Yarn](https://yarnpkg.com/) is the package manager of choice.

The node version used in this project is stored in [example/.node-version](example/.node-version) and [example/.nvmrc],

### Build

In order to build the web server, as stated [previously](#nodejs-and-ruby), we use `nodenv` for managing the environment:

```bash
# Clone the repository
$ git clone https://github.com/pagopa/io-react-native-wallet

# CD into the repository
$ cd debug-logging-server

# Install library dependencies
$ yarn install

# Run the web server
$ yarn node app.js
```
