//
//  MobileSecurityObject.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

struct MobileSecurityObject {
  public let version: String
  public static let defaultVersion = "1.0"
  public let digestAlgorithm: String
  public static let defaultDigestAlgorithmKind = DigestAlgorithmKind.SHA256
  public let valueDigests: ValueDigests
  public let deviceKeyInfo: DeviceKeyInfo
  public let docType: String
  public let validityInfo: ValidityInfo
  
  enum Keys: String {
    case version
    case digestAlgorithm
    case valueDigests
    case deviceKeyInfo
    case docType
    case validityInfo
  }
  
  public init(version: String, digestAlgorithm: String, valueDigests: ValueDigests, deviceKey: CoseKey, docType: String, validityInfo: ValidityInfo) {
    self.version = version
    self.digestAlgorithm = digestAlgorithm
    self.valueDigests = valueDigests
    self.deviceKeyInfo = DeviceKeyInfo(deviceKey: deviceKey)
    self.docType = docType
    self.validityInfo = validityInfo
  }
}

extension MobileSecurityObject: CBORDecodable {
  public init?(data: [UInt8]) throws {
    guard let obj = try? CBOR.decode(data) else {
      return nil
    }
    
    guard case let CBOR.tagged(tag, cborEncoded) = obj,
            tag.rawValue == 24,
          case let .byteString(bytes) = cborEncoded else {
      return nil
    }
    
    guard let cbor = try? CBOR.decode(bytes) else {
      return nil
    }
    
    try self.init(cbor: cbor)
  }
  
  public init?(cbor: CBOR) throws {
    guard case let .map(cborMap) = cbor else {
      return nil
    }
    
    guard case let .utf8String(version) = cborMap[Keys.version] else {
      return nil
    }
    
    self.version = version
    
    guard case let .utf8String(digestAlgorithm) = cborMap[Keys.digestAlgorithm] else {
      return nil
    }
    
    self.digestAlgorithm = digestAlgorithm
    
    guard let valueDigestsCbor = cborMap[Keys.valueDigests],
            let valueDigests = try ValueDigests(cbor: valueDigestsCbor) else {
      return nil
    }
    
    self.valueDigests = valueDigests
    
    guard let deviceKeyInfoCbor = cborMap[Keys.deviceKeyInfo],
            let deviceKeyInfo = try DeviceKeyInfo(cbor: deviceKeyInfoCbor) else {
      return nil
    }
    
    self.deviceKeyInfo = deviceKeyInfo
    
    guard case let .utf8String(docType) = cborMap[Keys.docType] else {
      return nil
    }
    
    self.docType = docType
    
    guard let validityInfoCbor = cborMap[Keys.validityInfo],
            let validityInfo = try ValidityInfo(cbor: validityInfoCbor) else {
      return nil
    }
    
    self.validityInfo = validityInfo
  }
}


extension MobileSecurityObject: CBOREncodable {
  public func toCBOR(options: CBOROptions) -> CBOR {
    var m = OrderedDictionary<CBOR, CBOR>()
    m[.utf8String(Keys.version.rawValue)] = .utf8String(version)
    m[.utf8String(Keys.digestAlgorithm.rawValue)] = .utf8String(digestAlgorithm)
    m[.utf8String(Keys.valueDigests.rawValue)] = valueDigests.toCBOR(options: options)
    m[.utf8String(Keys.deviceKeyInfo.rawValue)] = deviceKeyInfo.toCBOR(options: options)
    m[.utf8String(Keys.docType.rawValue)] = .utf8String(docType)
    m[.utf8String(Keys.validityInfo.rawValue)] = validityInfo.toCBOR(options: options)
    return .map(m)
  }
}
