import 'react-native-get-random-values';
import 'react-native-quick-base64';
import { registerRootComponent } from 'expo';
import { install } from 'react-native-quick-crypto';

import { initEnv } from './src/env';

install();
initEnv();

const App = require('./src/App').default;
registerRootComponent(App);
