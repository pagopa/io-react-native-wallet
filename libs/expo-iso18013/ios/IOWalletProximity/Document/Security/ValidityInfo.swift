//
//  ValidityInfo.swift
//  libIso18013
//
//  Created by Antonio on 03/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

 struct ValidityInfo {
  public let signed: String
  public let validFrom: String
  public let validUntil: String
  public let expectedUpdate: String?
  
  enum Keys: String {
    case signed
    case validFrom
    case validUntil
    case expectedUpdate
  }
  public init(signed: String, validFrom: String, validUntil: String, expectedUpdate: String? = nil) {
    self.signed = signed
    self.validFrom = validFrom
    self.validUntil = validUntil
    self.expectedUpdate = expectedUpdate
  }
}

extension ValidityInfo: CBORDecodable {
  public init?(cbor: CBOR) throws {
    
    guard case let .map(cborMap) = cbor else {
      return nil
    }
    
    guard case .tagged(let tag, let signedCbor) = cborMap[Keys.signed],
          tag == .standardDateTimeString,
          case let .utf8String(signed) = signedCbor else {
      return nil
    }
    
    self.signed = signed
    
    guard case .tagged(let tag, let validFromCbor) = cborMap[Keys.validFrom],
          tag == .standardDateTimeString,
          case let .utf8String(validFrom) = validFromCbor else {
      return nil
    }
    
    self.validFrom = validFrom
    
    guard case .tagged(let tag, let validUntilCbor) = cborMap[Keys.validUntil],
          tag == .standardDateTimeString,
          case let .utf8String(validUntil) = validUntilCbor else {
      return nil
    }
    
    self.validUntil = validUntil
    
    if case .tagged(let tag, let expectedUpdateCbor) = cborMap[Keys.expectedUpdate],
       tag == .standardDateTimeString,
       case let .utf8String(expectedUpdate) = expectedUpdateCbor {
      self.expectedUpdate = expectedUpdate
    } else {
      self.expectedUpdate = nil
    }
  }
}

extension ValidityInfo: CBOREncodable {
  public func toCBOR(options: CBOROptions) -> CBOR {
    var cborMap = OrderedDictionary<CBOR, CBOR>()
    
    cborMap[.utf8String(Keys.signed.rawValue)] = .tagged(.standardDateTimeString, .utf8String(signed))
    cborMap[.utf8String(Keys.validFrom.rawValue)] = .tagged(.standardDateTimeString, .utf8String(validFrom))
    cborMap[.utf8String(Keys.validUntil.rawValue)] = .tagged(.standardDateTimeString, .utf8String(validUntil))
    
    if let expectedUpdate {
      cborMap[.utf8String(Keys.expectedUpdate.rawValue)] = .tagged(.standardDateTimeString, .utf8String(expectedUpdate))
    }
    return .map(cborMap)
  }
}

