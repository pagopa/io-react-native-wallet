import ExpoModulesCore

public class ExpoIso18013CborModule: Module {
  private let implementation = IoReactNativeCbor()

  public func definition() -> ModuleDefinition {
    Name("ExpoIso18013Cbor")
    AsyncFunction("decode") { (data: String, promise: Promise) in
      self.implementation.decode(data: data, resolver: promise.legacyResolver, rejecter: promise.legacyRejecter)
    }
    AsyncFunction("decodeDocuments") { (data: String, promise: Promise) in
      self.implementation.decodeDocuments(data: data, resolver: promise.legacyResolver, rejecter: promise.legacyRejecter)
    }
    AsyncFunction("decodeIssuerSigned") { (data: String, promise: Promise) in
      self.implementation.decodeIssuerSigned(data: data, resolver: promise.legacyResolver, rejecter: promise.legacyRejecter)
    }
    AsyncFunction("sign") { (data: String, keyTag: String, promise: Promise) in
      self.implementation.sign(data: data, keyTag: keyTag, resolver: promise.legacyResolver, rejecter: promise.legacyRejecter)
    }
    AsyncFunction("verify") { (data: String, key: [String: Any], promise: Promise) in
      self.implementation.verify(data: data, publicKey: key as NSDictionary, resolver: promise.legacyResolver, rejecter: promise.legacyRejecter)
    }
  }
}
