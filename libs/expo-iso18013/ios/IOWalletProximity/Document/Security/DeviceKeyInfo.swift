//
//  DeviceKeyInfo.swift
//  libIso18013
//
//  Created by Antonio on 03/10/24.
//

internal import SwiftCBOR
internal import OrderedCollections

struct DeviceKeyInfo {
  public let deviceKey: CoseKey
  let keyAuthorizations: KeyAuthorizations?
  let keyInfo: CBOR?
  
  enum Keys: String {
    case deviceKey
    case keyAuthorizations
    case keyInfo
  }
  
  public init(deviceKey: CoseKey) {
    self.deviceKey = deviceKey
    self.keyAuthorizations = nil
    self.keyInfo = nil
  }
}

extension DeviceKeyInfo: CBORDecodable {
  public init?(cbor: CBOR) throws {
    guard case let .map(cborMap) = cbor else {
      return nil
    }
    
    guard let deviceKeyCbor = cborMap[Keys.deviceKey],
          let deviceKey = CoseKey(cbor: deviceKeyCbor) else {
      return nil
    }
    
    self.deviceKey = deviceKey
    
    if let keyAuthorizationsCbor = cborMap[Keys.keyAuthorizations],
       let keyAuthorizations = KeyAuthorizations(cbor: keyAuthorizationsCbor) {
      self.keyAuthorizations = keyAuthorizations
    } else {
      self.keyAuthorizations = nil
    }
    
    keyInfo = cborMap[Keys.keyInfo]
  }
}

extension DeviceKeyInfo: CBOREncodable {
  public func toCBOR(options: CBOROptions) -> CBOR {
    var cborMap = OrderedDictionary<CBOR, CBOR>()
    
    cborMap[.utf8String(Keys.deviceKey.rawValue)] = deviceKey.toCBOR(options: options)
    
    if let keyAuthorizations {
      cborMap[.utf8String(Keys.keyAuthorizations.rawValue)] = keyAuthorizations.toCBOR(options: options)
    }
    
    if let keyInfo {
      cborMap[.utf8String(Keys.keyInfo.rawValue)] = keyInfo
    }
    return .map(cborMap)
  }
}
