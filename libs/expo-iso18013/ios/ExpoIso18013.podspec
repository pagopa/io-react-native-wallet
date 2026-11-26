require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "package.json")))

Pod::Spec.new do |s|
  s.name         = "ExpoIso18013"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.license      = package["license"]
  s.authors      = "PagoPA"
  s.homepage     = "https://github.com/pagopa/io-react-native-wallet"

  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/pagopa/io-react-native-wallet.git", :tag => "#{s.version}" }

  s.source_files = "**/*.{h,m,mm,swift}"
  s.dependency "ExpoModulesCore"
  s.exclude_files = "Tests/**/*"

  # Unit tests of the vendored IOWalletCBOR and IOWalletProximity libraries.
  s.test_spec "Tests" do |test_spec|
    test_spec.source_files = "Tests/**/*.swift"
    test_spec.pod_target_xcconfig = {
      # Makes the Swift Package Manager modules visible to the test target, as done by spm_dependency for the library.
      "SWIFT_INCLUDE_PATHS" => "$(inherited) ${SYMROOT}/${CONFIGURATION}${EFFECTIVE_PLATFORM_NAME}/"
    }
  end

  # The IOWalletProximity (https://github.com/pagopa/iso18013-ios) and IOWalletCBOR (https://github.com/pagopa/cbor-ios)
  # libraries are vendored as source code in ios/IOWalletProximity and ios/IOWalletCBOR.
  # Their Swift Package Manager dependencies are added with the requirements of the upstream Package.swift manifests.
  if respond_to?(:spm_dependency, true)
    spm_dependency(s,
      url: "https://github.com/niscy-eudiw/SwiftCBOR.git",
      requirement: { kind: "upToNextMajorVersion", minimumVersion: "0.6.2" },
      products: ["SwiftCBOR"]
    )
    spm_dependency(s,
      url: "https://github.com/apple/swift-collections.git",
      requirement: { kind: "upToNextMajorVersion", minimumVersion: "1.1.3" },
      products: ["OrderedCollections"]
    )
    spm_dependency(s,
      url: "https://github.com/kishikawakatsumi/KeychainAccess.git",
      requirement: { kind: "upToNextMajorVersion", minimumVersion: "4.2.2" },
      products: ["KeychainAccess"]
    )
    spm_dependency(s,
      url: "https://github.com/apple/swift-asn1.git",
      requirement: { kind: "upToNextMajorVersion", minimumVersion: "1.3.1" },
      products: ["SwiftASN1"]
    )
    spm_dependency(s,
      url: "https://github.com/apple/swift-crypto.git",
      requirement: { kind: "exactVersion", version: "3.10.0" },
      products: ["Crypto"]
    )
    spm_dependency(s,
      url: "https://github.com/apple/swift-certificates.git",
      requirement: { kind: "upToNextMajorVersion", minimumVersion: "1.6.1" },
      products: ["X509"]
    )
  else
    raise "IoReactNativeIso18013 requires React Native >= 0.75 to resolve the Swift Package Manager dependencies of IOWalletProximity"
  end

  # Use install_modules_dependencies helper to install the dependencies if React Native version >=0.71.0.
  # See https://github.com/facebook/react-native/blob/febf6b7f33fdb4904669f99d795eba4c0f95d7bf/scripts/cocoapods/new_architecture.rb#L79.
  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
