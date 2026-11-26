import CryptoKit
import DeviceCheck
import ExpoModulesCore

public class ExpoIntegrityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoIntegrity")

    AsyncFunction("isAttestationServiceAvailable") { (promise: Promise) in
      guard DCAppAttestService.shared.isSupported else {
        promise.reject("UNSUPPORTED_SERVICE", "UNSUPPORTED_SERVICE")
        return
      }
      promise.resolve(true)
    }

    AsyncFunction("generateHardwareKey") { (promise: Promise) in
      guard DCAppAttestService.shared.isSupported else {
        promise.reject("UNSUPPORTED_SERVICE", "UNSUPPORTED_SERVICE")
        return
      }
      DCAppAttestService.shared.generateKey { key, error in
        guard let key = key, error == nil else {
          promise.reject("GENERATION_KEY_FAILED", error?.localizedDescription ?? "GENERATION_KEY_FAILED")
          return
        }
        promise.resolve(key)
      }
    }

    AsyncFunction("getAttestation") { (challenge: String, key: String, promise: Promise) in
      guard DCAppAttestService.shared.isSupported else {
        promise.reject("UNSUPPORTED_SERVICE", "UNSUPPORTED_SERVICE")
        return
      }
      let hash = Data(SHA256.hash(data: Data(challenge.utf8)))
      DCAppAttestService.shared.attestKey(key, clientDataHash: hash) { attestation, error in
        guard let attestation = attestation, error == nil else {
          promise.reject("ATTESTATION_ERROR", error?.localizedDescription ?? "ATTESTATION_ERROR")
          return
        }
        promise.resolve(attestation.base64EncodedString())
      }
    }

    AsyncFunction("generateHardwareSignatureWithAssertion") { (clientData: String, key: String, promise: Promise) in
      guard DCAppAttestService.shared.isSupported else {
        promise.reject("UNSUPPORTED_SERVICE", "UNSUPPORTED_SERVICE")
        return
      }
      let hash = Data(SHA256.hash(data: Data(clientData.utf8)))
      DCAppAttestService.shared.generateAssertion(key, clientDataHash: hash) { assertion, error in
        guard let assertion = assertion, error == nil else {
          promise.reject("GENERATION_ASSERTION_FAILED", error?.localizedDescription ?? "GENERATION_ASSERTION_FAILED")
          return
        }
        promise.resolve(assertion.base64EncodedString())
      }
    }
  }
}
