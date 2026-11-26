import Foundation
import React

@objc(IoReactNativeIso18013)
class IoReactNativeIso18013: NSObject, ISO18013Delegate {
  var eventHandler: ((String, [String: Any]) -> Void)?
  
  /**
   Type alias for the accepted fields during the presentation. These are the fields which the user accepted to share.
   It can be fed to the ``IOWalletProximity.generateResponse`` function.
   An example might be:
   `["org.iso.18013.5.1.mDL": ["org.iso.18013.5.1": ["hair_colour": true, "given_name_national_character": true, "family_name_national_character": true, "given_name": true]]]`
   */
  typealias AcceptedFieldsDict = [String: [String: [String: Bool]]]
  
  /**
   ISO18013Delegate event handler
   */
  func onEvent(event: ISO18013Event) {
    var eventName: String
    var eventBody: [String: Any] = [:]
    
    switch(event) {
    case .qrCode(let qrCode):
      eventName = "onQrCodeString"
      eventBody = ["data": qrCode]
      break

    case .bleConnecting:
      eventName = "onDeviceConnecting"
      break
      
    case .bleConnected:
      eventName = "onDeviceConnected"
      break

    case .nfcEngagementStarted:
      eventName = "onDeviceConnecting"
      break
      
    case .nfcEngagementDone:
      eventName = "onDeviceConnected"
      break
      
    case .dataTransferStarted(let args):
      eventName = "onDocumentRequestReceived"
      /**
       The outermost key represents the credential doctype, the inner key represents the namespace and the innermost key represents the requested fields with a boolean value. Example:
       {
         "org.iso.18013.5.1.mDL": {
           "isAuthenticated": true,
           "org.iso.18013.5.1": {
           "hair_colour": true,
           "given_name_national_character": true,
           "family_name_national_character": true,
           "given_name": true,
           }
         }
       }
       */
      eventBody = [
        // Here we either send the request or an empty string which signals that something went wrong.
        "data": args.request.flatMap { deviceRequestToJson(request: $0) } ?? "",
        "retrievalMethod": retrivalMethodToString(args.retrivalMethod)
      ]
      break

    case .dataTransferStopped:
      eventName = "onDeviceDisconnected"
      break
    
    case .nfcStarted:
      eventName = "onNfcStarted"
      break
      
    case .nfcStopped:
      eventName = "onNfcStopped"
      break

    case .error(let error):
      eventName = "onError"
      eventBody = ["error": error.localizedDescription]
      break
      
    default:
      eventName = "unknown"
      eventBody = ["error": "Received an unknown event"]
    }
    
    eventHandler?(eventName, eventBody)
  }

  /**
   Starts proximity engagement with QR Code/NFC engagement and BLE/NFC retrieval.
   Resolves to true or rejects with an error code defined in ``ModuleErrorCodes``.
   - Parameters:
   - `certificates`: Two-dimensional array of base64 strings representing DER encoded X.509 certificate which are used to authenticate the verifier app
   - `engagementModes`: Array of strings representing engamgnes modes (e.g., "QRCODE", "NFC")
   - `retrievalMethods`: Array of strings representing data transfer modes (e.g., "BLE", "NFC")
   - `resolve`: The promise to be resolved
   - `reject`: The promise to be rejected
   */
  @objc(startEngagement:withEngagementModes:withRetrievalMethods:withResolver:withRejecter:)
  func startEngagement(
    certificates: [Any],
    engagementModes: [String],
    retrievalMethods: [String],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ){
    do {
      let certsData = try parseCertificates(certificates)
      let parsedEngagementModes = try parseEngagementMode(engagementModes)
      let parsedRetrievalMethods = try parseDataTransferModes(retrievalMethods)

      ISO18013.shared
        .start(
          certsData,
          engagementModes: parsedEngagementModes,
          retrivalMethods: parsedRetrievalMethods,
          delegate: self,
          isNfcLateEngagement: false
        )
      resolve(true)
    } catch {
      reject(ModuleErrorCodes.startError.rawValue, error.localizedDescription, error)
    }
  }
  
  /**
   Closes connections, stops BLE, stops NFC and clears any resource.
   Resolves to true after closing the connection or rejects with an error code defined in ``ModuleErrorCodes``.
   - Parameters:
   - resolve: The promise to be resolved.
   - reject:  The promise to be rejected.
   */
  @objc(close:withRejecter:)
  func close(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    ISO18013.shared.stop()
    resolve(true)
  }
  
  /**
   Utility function to parse an array coming from the React Native Bridge into an array of Data representing DER encoded X.509 certificates.
   - Parameters:
   - certificates: Two-dimensional array of base64 strings representing DER encoded X.509 certificate
   - Throws: `ParsingError` if the provided certificate is not a valid base64 encoded string.
   - Returns: A two-dimensional array of Data containing DER encoded X.509 certificates.
   */
  private func parseCertificates(_ certificates: [Any]) throws -> [[Data]] {
    return try certificates.enumerated().compactMap { (chainIndex, item) in
      guard let certStrings = item as? [String] else {
        throw ParsingError.certificatesNotValid("Certificate chain at index \(chainIndex) is not an array of strings.")
      }
      return try certStrings.enumerated().map { (certIndex, certString) in
        guard let data = Data(base64Encoded: certString) else {
          throw ParsingError.certificatesNotValid("Certificate at index \(certIndex) in the chain at index \(chainIndex) is not a valid base64 string.")
        }
        return data
      }
    }
  }
  
  /**
   Utility function to parse engagement mode strings into ISO18013EngagementMode enum values.
   - Parameters:
   - modes: Array of strings representing engamgnes modes (e.g., "QRCODE", "NFC")
   - Throws: `ParsingError` if an invalid data transfer mode string is provided.
   - Returns: An array of ISO18013EngagementMode values.
   */
  private func parseEngagementMode(_ modes: [String]) throws -> [ISO18013EngagementMode] {
    return try modes.map { modeString in
      switch modeString.lowercased() {
      case "qrcode":
        return .qrCode
      case "nfc":
        return .nfc
      default:
        throw ParsingError.dataTransferModeNotValid("Invalid data engagement mode: '\(modeString)'. Expected 'qrcode' or 'nfc'.")
      }
    }
  }
  
  /**
   Utility function to parse data transfer mode strings into ISO18013DataTransferMode enum values.
   - Parameters:
   - modes: Array of strings representing data transfer modes (e.g., "BLE", "NFC")
   - Throws: `ParsingError` if an invalid data transfer mode string is provided.
   - Returns: An array of ISO18013DataTransferMode values.
   */
  private func parseDataTransferModes(_ modes: [String]) throws -> [ISO18013DataTransferMode] {
    return try modes.map { modeString in
      switch modeString.lowercased() {
      case "ble":
        return .ble
      case "nfc":
        return .nfc
      default:
        throw ParsingError.dataTransferModeNotValid("Invalid data transfer mode: '\(modeString)'. Expected 'ble' or 'nfc'.")
      }
    }
  }
  
  /**
   Parses an array of documents from the React Native bridge which doesn't have any typing to an array of ``IOWalletProximity.ProximityDocument``.
   It checks if each element in the array has  `issuerSignedContent`, `alias` and `docType` properties in order to build a ``IOWalletProximity.ProximityDocument``, then it appens it to the array.
   The result can be fed to ``IOWalletProximity.generateResponse``.
   - Parameters:
   - documents: An array containing documents. Each document is defined as a map containing:
   - issuerSignedContent which is a base64 or base64url encoded string representing the credential;
   - alias which is the alias of the key used to sign the credential;
   - docType which is the document type.
   - Throws: `ParsingError`:
   - If the provided documents array do not contain a dictionary;
   - If the provided dictionary doesn't adhere to the structure we expect;
   - If the issuerSignedContent is not a valid base64 or base64url encoded string;
   - If the creation of a ProximityDdocument fails.
   - Returns: An array of `ProximityDocument` containg the documents to be presented.
   */
  private func parseDocuments(documents: [Any]) throws -> [ProximityDocument] {
    return try documents.map{ (element) -> ProximityDocument in
      guard let dict : [String: Any] = element as? [String: Any] else { throw ParsingError.documentsNotValid("The provided documents array element can't be parsed as a dictionary") }
      guard
        let issuerSignedContent = dict["issuerSignedContent"] as? String,
        let alias = dict["alias"] as? String,
        let docType = dict["docType"] as? String,
        let decodedIssuerSignedContent = try? Base64Utils.decodeBase64OrBase64URL(base: issuerSignedContent)
      else {
        throw ParsingError.documentsNotValid ("The provided issuerSignedContent is not a valid base64 or base64url or don't contain the required fields alas, doctype and issuerSignedContent")
      }
      guard let document = ProximityDocument(
        docType: docType,
        issuerSigned: [UInt8](decodedIssuerSignedContent),
        deviceKeyTag: alias
      ) else {
        throw ParsingError.documentsNotValid("The parsing for the document with docType \(docType) failed")
      }
      return document
    }
  }
  
  /**
   Parses a dictionary of accepted fields for the presentation from the React Native bridge which doesn't have any typing to a ``AcceptedFieldsDict`` dictionary.
   It checks if each element in the array is a dictionary where the key is a string, and the value is another dictionary. This nested dictionary has a string as its key and a boolean as its value, then it appens it to the array.
   The result can be fed to ``IOWalletProximity.generateResponse``.
   - Parameters:
   - acceptedFields: A dictionary of any elements. In order to be added to the result dictionary each element must be shaped as ``AcceptedFieldsDict`` thus as [String: [String: [String: Bool]]].
   - Throws: `ParsingError` if a value doesn't has the ``AcceptedFieldsDict`` shape or the result dictionary is empty.
   - Returns: An ``AcceptedFieldsDict`` containg the accepted fields to be presented.
   */
  private func parseAcceptedFields(acceptedFields: [AnyHashable: Any]) throws(ParsingError) -> AcceptedFieldsDict {
    var result: AcceptedFieldsDict = [:]
    
    for (key, value) in acceptedFields {
      guard let keyString = key as? String else {
        throw ParsingError.acceptedFieldsNotValid("The accepted fields keys must be a String")
      }
      guard let valueDict = value as? [String: [String: Bool]] else {
        throw ParsingError.acceptedFieldsNotValid("The accepted fields values must be of type [String: [String: Bool]]")
      }
      result[keyString] = valueDict
    }
    
    return result
  }
  
  /**
   Generates a response containing the documents and the fields which the user decided to present.
   It parses the untyped ``documents`` and ``acceptedFields`` parameters and feeds them to the ``IOWalletProximity.generateDeviceResponse`` function.
   Resolves with a base64 encoded response or rejects with an error code defined in ``ModuleErrorCodes``.
   - Parameters:
   - documents: An array containing documents. Each document is defined as a map containing:
   - issuerSignedContent which is a base64 or base64url encoded string representing the credential;
   - alias which is the alias of the key used to sign the credential;
   - docType which is the document type.
   - acceptedFields: A dictionary of elements, where each element must adhere to the structure of AcceptedFieldsDict—specifically, a [String: [String: [String: Bool]]]. The outermost key represents the credential doctype. The inner dictionary contains namespaces, and for each namespace, there is another dictionary mapping requested claims to a boolean value, which indicates whether the user is willing to present the corresponding claim. Example:
   
   
   {
   "org.iso.18013.5.1.mDL": {
   "org.iso.18013.5.1": {
   "hair_colour": true,
   "given_name_national_character": true,
   "family_name_national_character": true,
   "given_name": true,
   }
   }
   }
   
   - resolve: The promise to be resolved.
   - reject: The promise to be rejected.
   */
  @objc(generateResponse:withAcceptedFields:withResolver:withRejecter:)
  func generateResponse(
    documents: Array<Any>,
    acceptedFields: [AnyHashable: Any],
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ){
    do {
      let parsedDocuments = try parseDocuments(documents: documents)
      let items = try parseAcceptedFields(acceptedFields: acceptedFields)
      let deviceResponse = try ISO18013.shared.generateDeviceResponse(items: items, documents: parsedDocuments, sessionTranscript: nil)
      let strDeviceResponse = Data(deviceResponse).base64EncodedString()
      resolve(strDeviceResponse)
    }
    catch {
      reject(ModuleErrorCodes.generateResponseError.rawValue, error.localizedDescription, error)
    }
  }
  
  /**
   Sends a response containing the documents and the fields which the user decided to present generated by ``generateResponse``.
   Currently there's not evidence of the verifier app responding to this request, thus we don't handle the response.
   Resolves with a true boolean in case of success or rejects with an error code defined in ``ModuleErrorCodes``.
   - Parameters:
   - response: A base64 encoded string containing the response generated by ``generateResponse``
   - resolve: The promise to be resolved
   - reject: The promise to be rejected
   */
  @objc(sendResponse:withResolver:withRejecter:)
  func sendResponse(
    response: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ){
    guard let responseData = Data(base64Encoded: response) else {
      reject(ModuleErrorCodes.sendResponseError.rawValue, "The provided response is not a valid base64 string", nil)
      return
    }
    do{
      try ISO18013.shared.dataPresentation([UInt8](responseData))
      resolve(true)
    }catch let error {
      reject(ModuleErrorCodes.sendResponseError.rawValue, error.localizedDescription, error)
    }
  }
  
  /**
   Sends an error response during the presentation according to the SessionData status codes defined in table 20 of the ISO18013-5 standard.
   Resolves to true or rejects with an error code defined in ``ModuleErrorCodes``.
   - Parameters:
   - code: The status error to be sent is an integer of type ``SessionDataStatus``:
   ```
   10 -> Error: session encryption
   11 -> Error: CBOR decoding
   20 -> Session termination
   ```
   - resolve: The promise to be resolved.
   - reject: The promise to be rejected.
   */
  @objc(sendErrorResponse:withResolver:withRejecter:)
  func sendErrorResponse(code: UInt64, _ resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock){
    guard let statusEnum = SessionDataStatus(rawValue: code) else {
      reject(ModuleErrorCodes.sendErrorResponseError.rawValue, "Invalid status code provided: \(code)", nil)
      return
    }
    do{
      try ISO18013.shared.errorPresentation(statusEnum)
      resolve(true)
    }catch let error{
      reject(ModuleErrorCodes.sendErrorResponseError.rawValue, error.localizedDescription, error)
    }
  }
  
  /**
   Converts a device requested from the `onDocumentRequestReceived` callback into a serializable JSON.
   - Parameters:
   - request: The request returned from `onDocumentRequestReceived` which contains an array of tuples consists of a doctype, namespaces, the requested claims with a boolean value indicating wether or not the device which is making the request has an intent to retain the data, and optional certificate data from the verifier X.509 certificate.
   - Returns: A JSON string representing the device request or nil if an error occurs.
   */
  private func deviceRequestToJson(request: [(docType: String, nameSpaces: [String: [String: Bool]], isAuthenticated: Bool, certificateData: [String: String]?)]?) -> String? {
    var jsonRequest : [String: AnyHashable] = [:]
    request?.forEach({
      item in
      var subReq: [String: AnyHashable] = [:]
      item.nameSpaces.keys.forEach({
        nameSpace in
        subReq[nameSpace] = item.nameSpaces[nameSpace]
      })
      
      subReq["isAuthenticated"] = item.isAuthenticated
      if let certData = item.certificateData {
        subReq["certificateData"] = certData
      }
      
      jsonRequest[item.docType] = subReq
    })
    
    let json: [String: AnyHashable] = [
      "request": jsonRequest
    ]
    
    if let jsonData = try? JSONSerialization.data(withJSONObject: json, options: .prettyPrinted),
       let jsonString = String(data: jsonData, encoding: .utf8) {
      return jsonString
    } else {
      return nil
    }
  }
  
  /**
   Generates a CBOR encoded device response for ISO 18013-7 mDL remote presentation using OID4VP.
   Resolves with the base64 encoded device response or rejects with an error code defined in ``ModuleErrorCodes``.
   - Parameters:
   - clientId: The client id extracted from OID4VP session.
   - responseUri: The response URI extracted from OID4VP session.
   - authorizationRequestNonce - The authorization request nonce extracted from OID4VP session.
   - jwkThumbprint - the base64url-encoded SHA-256 thumbprint (RFC 7638) of the response encryption key, or null for an unencrypted response.
   - documents: An array containing documents. Each document is defined as a map containing:
   - issuerSignedContent which is a base64 or base64url encoded string representing the credential;
   - alias which is the alias of the key used to sign the credential;
   - docType which is the document type.
   - acceptedFields: A dictionary of elements, where each element must adhere to the structure of AcceptedFieldsDict—specifically, a `[String: [String: [String: Bool]]]`. The outermost key represents the credential doctype. The inner dictionary contains namespaces, and for each namespace, there is another dictionary mapping requested claims to a boolean value, which indicates whether the user is willing to present the corresponding claim. Example:
   
   
   {
     "org.iso.18013.5.1.mDL": {
       "org.iso.18013.5.1": {
         "hair_colour": true,
         "given_name_national_character": true,
         "family_name_national_character": true,
         "given_name": true,
       },
       {...}
     },
     {...}
   }
   
   - resolve: The promise to be resolved.
   - reject: The promise to be rejected.
   */
  @objc(generateOID4VPDeviceResponse:withResponseUri:withAuthorizationRequestNonce:withJwkThumbprint:withDocuments:withAcceptedFields:withResolver:withRejecter:)
  func generateOID4VPDeviceResponse(
    clientId: String,
    responseUri: String,
    authorizationRequestNonce: String,
    jwkThumbprint: String?,
    documents: [Any],
    acceptedFields: [AnyHashable: Any],
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    
    do {
      let thumbprintBytes = try jwkThumbprint.map {
        let bytes = try Base64Utils.decodeBase64OrBase64URL(base: $0)
        guard bytes.count == 32 else {
          throw NSError(domain: "IoReactNativeIso18013", code: 0, userInfo: [
            NSLocalizedDescriptionKey: "jwkThumbprint must contain a SHA-256 digest (32 bytes)"
          ])
        }
        return [UInt8](bytes)
      }
      let sessionTranscript = ISO18013.shared.generateOID4VPSessionTranscriptCBOR(
        clientId: clientId,
        responseUri: responseUri,
        authorizationRequestNonce: authorizationRequestNonce,
        jwkThumbprint: thumbprintBytes
      )
      
      let documentsAsProximityDocument = try parseDocuments(documents: documents)
      let items = try parseAcceptedFields(acceptedFields: acceptedFields)
      let response = try ISO18013.shared.generateDeviceResponse(items: items, documents: documentsAsProximityDocument, sessionTranscript: sessionTranscript)
      resolve(Data(response).base64EncodedString())
    } catch {
      reject(ModuleErrorCodes.generateOID4VPResponseError.rawValue, error.localizedDescription, error)
    }
  }
  
  /**
    Sets a custom message to be displayed in the NFC HCE modal during NFC engagement.
 
    - Parameters:
    - message: The custom message to be displayed in the NFC HCE modal. 
  */
  @objc func setHceModalMessage(
    _ message: String
  ) {
    if #available(iOS 17.4, *) {
        ISO18013.shared.setNfcHceMessage(message: message)
    }
  }
  
  /**
   Custom Error which is thrown when a parsing error occurs in our utility functions which converts data from the bridge to what
   our underlying functions expect.
   This is needed in order to provide a customized description which can include more debug information.
   */
  enum ParsingError : LocalizedError, CustomStringConvertible {
    case documentsNotValid(String)
    case certificatesNotValid(String)
    case acceptedFieldsNotValid(String)
    case dataTransferModeNotValid(String)
    
    public var description: String {
      switch(self) {
      case .documentsNotValid(let message):
        return message
      case .certificatesNotValid(let message):
        return message
      case .acceptedFieldsNotValid(let message):
        return message
      case .dataTransferModeNotValid(let message):
        return message
      }
    }
    
    var errorDescription: String? { description }
  }
  
  /**
   Maps a retrival method enum value to its string representation.
   */
  private func retrivalMethodToString(_ method: ISO18013DataTransferMode) -> String {
    switch method {
    case .ble:
      return "ble"
    case .nfc:
      return "nfc"
    }
  }

  // Errors which this module uses to reject a promise
  private enum ModuleErrorCodes: String, CaseIterable {
    // ISO18013-5 related errors
    case startError = "START_ERROR"
    case stopError = "STOP_ERROR"
    case sendResponseError = "SEND_RESPONSE_ERROR"
    case sendErrorResponseError = "SEND_ERROR_RESPONSE_ERROR"
    case generateResponseError = "GENERATE_RESPONSE_ERROR"
    
    // ISO18013-7 related errors
    case generateOID4VPResponseError = "GENERATE_OID4VP_RESPONSE_ERROR"
  }
}
