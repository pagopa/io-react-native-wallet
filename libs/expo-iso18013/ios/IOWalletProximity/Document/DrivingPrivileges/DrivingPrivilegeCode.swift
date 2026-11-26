//
//  DrivingPrivilegeCode.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//


import Foundation
internal import SwiftCBOR
internal import OrderedCollections

struct DrivingPrivilegeCode: Codable {
  public let code: String
  public let sign: String?
  public let value: String?
  
  enum CodingKeys: String, CodingKey, CaseIterable {
    case code = "code"
    case sign = "sign"
    case value = "value"
  }
}

extension DrivingPrivilegeCode: CBORDecodable {
  public init?(cbor: CBOR) throws {
    guard case let .utf8String(code) = cbor[.utf8String(CodingKeys.code.rawValue)] else {
      return nil
    }
    
    self.code = code
    
    if case let .utf8String(sign) = cbor[.utf8String(CodingKeys.sign.rawValue)] {
      self.sign = sign
    } else {
      self.sign = nil
    }
    
    if case let .utf8String(value) = cbor[.utf8String(CodingKeys.value.rawValue)] {
      self.value = value
    } else {
      self.value = nil
    }
  }
}

extension DrivingPrivilegeCode: CBOREncodable {
  public func toCBOR(options: CBOROptions) -> CBOR {
    var cborMap = OrderedDictionary<CBOR, CBOR>()
    cborMap[.utf8String(CodingKeys.code.rawValue)] = .utf8String(code)
    if let sign { cborMap[.utf8String(CodingKeys.sign.rawValue)] = .utf8String(sign) }
    if let value { cborMap[.utf8String(CodingKeys.value.rawValue)] = .utf8String(value) }
    return .map(cborMap)
  }
}
