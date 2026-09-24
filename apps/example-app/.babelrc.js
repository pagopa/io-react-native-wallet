const path = require('path');

const walletPackageRoot = path.resolve(
  __dirname,
  '../../libs/io-react-native-wallet'
);
const walletPackage = require(path.join(walletPackageRoot, 'package.json'));
const resolvePackageRoot = (packageName) =>
  path.dirname(require.resolve(`${packageName}/package.json`));

module.exports = function (api) {
  api.cache(true);
  return {
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            buffer: resolvePackageRoot('@craftzdog/react-native-buffer'),
            crypto: resolvePackageRoot('react-native-quick-crypto'),
            [walletPackage.name]: path.resolve(
              walletPackageRoot,
              walletPackage.source
            ),
            stream: resolvePackageRoot('readable-stream'),
          },
          extensions: ['.tsx', '.ts', '.js', '.json'],
        },
      ],
    ],
    presets: ['babel-preset-expo'],
  };
};
