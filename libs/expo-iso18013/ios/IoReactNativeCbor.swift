import CryptoKit
import React

@objc(IoReactNativeCbor)
class IoReactNativeCbor: NSObject {
  
  /**
   Decode base64 or base64url encoded CBOR data to JSON object.
   Resolves with a string containing the parsed data or rejects with an error code defined in ``ModuleErrorCodes``.
   This method does not handle nested CBOR data, which will need additional parsing.
   - Parameters:
      - data: The base64 or base64url encoded CBOR string.
      - resolve: The promise to be resolved.
      - reject: The promise to be rejected.
   */
  @objc(decode:withResolver:withRejecter:)
  func decode(
    data: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do{
      let buffer = try Base64Utils.decodeBase64OrBase64URL(base: data)
      guard let json = CborCose.jsonFromCBOR(data: buffer) else {
        // We don't have the exact error here as this method returns nil upon failure
        reject(ModuleErrorCodes.decodeError.rawValue, "Unable to decode CBOR", nil)
        return
      }
      resolve(json);
      
    }catch{
      reject(ModuleErrorCodes.decodeError.rawValue, error.localizedDescription, error)
    }
  }
  
  /**
   Decode base64 or base64url encoded mDOC-CBOR data to a JSON object.
   Resolves with a string containing the parsed data or rejects with an error code defined in ``ModuleErrorCodes``.
   - Parameters:
      - data: The base64 or base64url encoded mDOC-CBOR string.
      - resolve: The promise to be resolved.
      - reject: The promise to be rejected.
   */
  @objc(decodeDocuments:withResolver:withRejecter:)
  func decodeDocuments(
    data: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do{
      let buffer = try Base64Utils.decodeBase64OrBase64URL(base: data)
      guard let json = CborCose.decodeCBOR(data: buffer, true, true) else {
        // We don't have the exact error here as this method returns nil upon failure
        reject(ModuleErrorCodes.decodeDocumentsError.rawValue, "Unable to decode document CBOR", nil)
        return
      }
      resolve(json);
    }catch{
      reject(ModuleErrorCodes.decodeDocumentsError.rawValue, error.localizedDescription, error)
    }
  }
  
  /**
   Decode base64 or base64url encoded issuerSigned attribute part of an mDOC-CBOR.
   Resolves with a string containing the parsed data or rejects with an error code defined in ``ModuleErrorCodes``.
   - Parameters:
      - data: The base64 or base64url encoded mDOC-CBOR containing the issuerSigned data string.
      - resolve: The promise to be resolved.
      - reject: The promise to be rejected.
   */
  @objc(decodeIssuerSigned:withResolver:withRejecter:)
  func decodeIssuerSigned(
    data: String,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do{
      let buffer = try Base64Utils.decodeBase64OrBase64URL(base: data)
      guard let json = CborCose.issuerSignedCborToJson(data: buffer) else {
        // We don't have the exact error here as this method returns nil upon failure
        reject(ModuleErrorCodes.decodeIssuerSignedError.rawValue, "Unable to decode Issuer Signed CBOR", nil)
        return
      }
      resolve(json);
    }catch{
      reject(ModuleErrorCodes.decodeIssuerSignedError.rawValue, error.localizedDescription, error)
    }
  }
  
  /**
   Sign base64 encoded data with COSE and return the COSE-Sign1 object in base64 encoding.
   Resolves with a string containing the COSE-Sign1 object in base64 encoding or rejects with an error code defined in ``ModuleErrorCodes``.
   - Parameters:
     - data: The base64 or base64url encoded payload to sign.
     - keyTag: The alias of the key to use for signing.
     - resolve: The promise to be resolved.
     - reject: The promise to be rejected.
   */
  @objc(sign:withKeyTag:withResolver:withRejecter:)
  func sign(
    data: String,
    keyTag: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
      DispatchQueue.global().async { [weak self] in
        guard self != nil else {
          reject(ModuleErrorCodes.threadingError.rawValue, "Failed to perform background operation, self was deallocated", nil)
          return
        }
        
        do{
          let buffer = try Base64Utils.decodeBase64OrBase64URL(base: data)
          guard let coseKey = IOWalletCBORCoseKeyPrivate(crv: .p256, keyTag: keyTag) else {
            // We don't have the exact error here as this method returns nil upon failure
            reject(ModuleErrorCodes.signError.rawValue, "Unable to create a private key with the given keytag: \(keyTag)", nil)
            return
          }
          let signedPayload = CborCose.sign(data: buffer, privateKey: coseKey)
          resolve(signedPayload.base64EncodedString())
      }
      catch{
        reject(ModuleErrorCodes.signError.rawValue, error.localizedDescription, error)
      }
    }
  }
  
  /**
   Verifies a COSE-Sign1 object with the provided public key.
   Resolves with boolean indicating whether or not the verification succeeded or not or rejects with an error code defined in ``ModuleErrorCodes``.
   - Parameters:
      - data: The COSE-Sign1 object in base64 or base64url encoding.
      - publicKey: The public key in JWK format.
      - resolve: The promise to be resolved
      - reject: The promise to be rejected..
   */
  @objc(verify:withJwk:withResolver:withRejecter:)
  func verify(
    data: String,
    publicKey: NSDictionary,
    resolver resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    do {
      let buffer = try Base64Utils.decodeBase64OrBase64URL(base: data)
      let publicKeyJson = try JSONSerialization.data(withJSONObject: publicKey, options:[] )
      let publicKeyString = String(data: publicKeyJson, encoding: .utf8)!
      let publicKey = IOWalletCBORCoseKey(jwk: publicKeyString)!
      let verified = CborCose.verify(data: buffer, publicKey: publicKey)
      resolve(verified)
    } catch {
      reject(ModuleErrorCodes.verifyError.rawValue, error.localizedDescription, error)
    }
  }
  
  // Errors which this module uses to reject a promise
  private enum ModuleErrorCodes: String, CaseIterable {
    case decodeError = "DECODE_ERROR"
    case decodeDocumentsError = "DECODE_DOCUMENTS_ERROR"
    case decodeIssuerSignedError = "DECODE_ISSUER_SIGNED_ERROR"
    case signError = "SIGN_ERROR"
    case verifyError = "VERIFY_ERROR"
    case threadingError = "THREADING_ERROR"
  }
}
