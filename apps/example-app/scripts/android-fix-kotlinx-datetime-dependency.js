const { withProjectBuildGradle } = require("@expo/config-plugins");

/**
 * This plugin fixes a runtime crash (NoClassDefFoundError: kotlinx/datetime/Clock$System) at proximity engagement
 * in debug builds. expo-dev-launcher (debug only) depends on kotlinx-datetime 0.7.x, which removed kotlinx.datetime.Clock
 * and kotlinx.datetime.Instant, while com.android.identity (used by io-react-native-iso18013) is compiled against 0.6.x.
 * Any 0.7.x request is redirected to the matching 0.6.x-compat artifact, which ships both the 0.7.x and the 0.6.x APIs.
 * Release builds only request 0.6.x and are therefore left untouched.
 * This patch can be removed once com.android.identity migrates to kotlin.time.Clock, whose only user is, for the moment,
 * @pagopa/io-react-native-iso18013 through it.pagopa.io.wallet.proximity and it.pagopa.io.wallet.cbor.
 */
const GRADLE_FIX_MARKER =
  "Fix kotlinx-datetime 0.7.x breaking com.android.identity";
const GRADLE_FIX = `

// ${GRADLE_FIX_MARKER}
allprojects {
    configurations.all {
        c -> c.resolutionStrategy.eachDependency {
            DependencyResolveDetails dependency ->
                if (dependency.requested.group == 'org.jetbrains.kotlinx' &&
                    dependency.requested.name in ['kotlinx-datetime', 'kotlinx-datetime-jvm'] &&
                    dependency.requested.version ==~ /0\\.7\\.\\d+/) {
                    dependency.useVersion "\${dependency.requested.version}-0.6.x-compat"
                    dependency.because 'com.android.identity requires kotlinx.datetime.Clock, removed in kotlinx-datetime 0.7.x'
                }
        }
    }
}
`;

module.exports = (config) =>
  withProjectBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes(GRADLE_FIX_MARKER)) {
      config.modResults.contents += GRADLE_FIX;
    }

    return config;
  });
