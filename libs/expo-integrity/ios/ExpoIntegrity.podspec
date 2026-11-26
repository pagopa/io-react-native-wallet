require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ExpoIntegrity'
  s.version        = package['version']
  s.summary        = package['description']
  s.description    = package['description']
  s.license        = package['license']
  s.author         = 'PagoPA'
  s.homepage       = 'https://github.com/pagopa/io-react-native-wallet'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => 'https://github.com/pagopa/io-react-native-wallet.git' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files   = '**/*.{h,m,mm,swift}'
end
