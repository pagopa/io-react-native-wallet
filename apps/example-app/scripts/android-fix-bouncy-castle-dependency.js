const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * This plugin fixes an issue cause by io-react-native-iso18013 library which causes a dependency resolution conflict with bouncy castle.
 */
const GRADLE_FIX = `
allprojects {
    configurations.all {
        c -> c.resolutionStrategy.eachDependency {
            DependencyResolveDetails dependency ->
                 if (dependency.requested.group == 'org.bouncycastle') {
                    dependency.useTarget 'org.bouncycastle:bcprov-jdk18on:1.77'
                }
        }
    }
}
`;

module.exports = config => {
  return withProjectBuildGradle(config, config => {
    if (
      !config.modResults.contents.includes('org.bouncycastle:bcprov-jdk18on')
    ) {
      config.modResults.contents += GRADLE_FIX;
    }
    return config;
  });
};