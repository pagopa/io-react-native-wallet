# IO app IT-Wallet

This Nx monorepo contains the IT-Wallet implementation used by
[IO, the Italian public services app](https://github.com/pagopa/io-app).

The workspace contains:

| Project | Description |
| --- | --- |
| [`@io-app-it-wallet/io-react-native-wallet`](libs/io-react-native-wallet/README.md) | The React Native library containing the IT-Wallet domain logic and APIs. |
| [`@io-app-it-wallet/example-app`](apps/example-app/README.md) | An Expo React Native app used to develop and test the libraries in this monorepo. |

## Set up the development environment

Install and activate the Node.js version declared in `.node-version` with your
preferred version manager. For example, with `nodenv`:

```sh
nodenv install 
nodenv local # Should match the version in .node-version
```

Enable Corepack and install the workspace dependencies:

```sh
corepack enable
pnpm install
```

## Run workspace tasks

Run tasks through Nx from the repository root:

```sh
pnpm nx run <project>:<target>
```

Validate the projects affected by the current changes:

```sh
pnpm nx affected --targets=test,lint,typecheck
```

Validate every project:

```sh
pnpm nx run-many --targets=test,lint,typecheck --all
```

List the projects in the workspace or inspect the targets available for a
specific project:

```sh
pnpm nx show projects
pnpm nx show project @io-app-it-wallet/io-react-native-wallet
pnpm nx show project @io-app-it-wallet/example-app
```
