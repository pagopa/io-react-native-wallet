import ExpoModulesCore

public class ExpoIso18013Module: Module {
  private let implementation = IoReactNativeIso18013()

  public func definition() -> ModuleDefinition {
    Name("ExpoIso18013")
    Events(
      "onQrCodeString", "onNfcStarted", "onNfcStopped", "onDeviceConnecting",
      "onDeviceConnected", "onDocumentRequestReceived", "onDeviceDisconnected", "onError", "unknown"
    )
    OnCreate {
      self.implementation.eventHandler = { [weak self] name, body in
        self?.sendEvent(name, body)
      }
    }
    OnDestroy {
      ISO18013.shared.stop()
      self.implementation.eventHandler = nil
    }
    AsyncFunction("startEngagement") {
      (certificates: [[String]], engagement: [String], retrieval: [String], promise: Promise) in
      self.implementation.startEngagement(
        certificates: certificates, engagementModes: engagement, retrievalMethods: retrieval,
        resolve: promise.legacyResolver, reject: promise.legacyRejecter
      )
    }.runOnQueue(.main)
    AsyncFunction("close") { (promise: Promise) in
      self.implementation.close(resolve: promise.legacyResolver, reject: promise.legacyRejecter)
    }.runOnQueue(.main)
    AsyncFunction("sendErrorResponse") { (code: UInt64, promise: Promise) in
      self.implementation.sendErrorResponse(code: code, promise.legacyResolver, reject: promise.legacyRejecter)
    }
    AsyncFunction("generateResponse") {
      (documents: [[String: Any]], fields: [String: Any], promise: Promise) in
      self.implementation.generateResponse(
        documents: documents, acceptedFields: fields,
        resolve: promise.legacyResolver, reject: promise.legacyRejecter
      )
    }
    AsyncFunction("sendResponse") { (response: String, promise: Promise) in
      self.implementation.sendResponse(response: response, resolve: promise.legacyResolver, reject: promise.legacyRejecter)
    }
    AsyncFunction("generateOID4VPDeviceResponse") {
      (clientId: String, responseUri: String, nonce: String, thumbprint: String?,
       documents: [[String: Any]], fields: [String: Any], promise: Promise) in
      self.implementation.generateOID4VPDeviceResponse(
        clientId: clientId, responseUri: responseUri, authorizationRequestNonce: nonce,
        jwkThumbprint: thumbprint, documents: documents, acceptedFields: fields,
        resolver: promise.legacyResolver, rejecter: promise.legacyRejecter
      )
    }
    Function("setHceModalMessage") { (message: String) in
      self.implementation.setHceModalMessage(message)
    }
  }
}
