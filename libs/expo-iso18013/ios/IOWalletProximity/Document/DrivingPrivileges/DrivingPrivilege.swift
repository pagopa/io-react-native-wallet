//
//  DrivingPrivilege.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

 struct DrivingPrivilege: Codable {
  public let vehicleCategoryCode: String
  public let issueDate: String?
  public let expiryDate: String?
  public let codes: [DrivingPrivilegeCode]?
  
  enum CodingKeys: String, CodingKey, CaseIterable {
    case vehicleCategoryCode = "vehicle_category_code"
    case issueDate = "issue_date"
    case expiryDate = "expiry_date"
    case codes = "codes"
  }
}

extension DrivingPrivilege: CBORDecodable {
  public init?(cbor: CBOR) throws {
    guard case let .utf8String(vehicleCategory) = cbor[.utf8String(CodingKeys.vehicleCategoryCode.rawValue)] else {
      return nil
    }
    vehicleCategoryCode = vehicleCategory
    if let issueDate = cbor[.utf8String(CodingKeys.issueDate.rawValue)]?.fullDate() {
      self.issueDate = issueDate
    } else {
      self.issueDate = nil
    }
    if let expiryDate = cbor[.utf8String(CodingKeys.expiryDate.rawValue)]?.fullDate() {
      self.expiryDate = expiryDate
    } else {
      self.expiryDate = nil
    }
    if case let .array(codes) = cbor[.utf8String(CodingKeys.codes.rawValue)] {
      self.codes = try codes.compactMap(DrivingPrivilegeCode.init(cbor:))
    } else {
      self.codes = nil
    }
  }
}

extension DrivingPrivilege: CBOREncodable {
  public func toCBOR(options: CBOROptions) -> CBOR {
    var cborMap = OrderedDictionary<CBOR, CBOR>()
    cborMap[.utf8String(CodingKeys.vehicleCategoryCode.rawValue)] = .utf8String(vehicleCategoryCode)
    if let issueDate { cborMap[.utf8String(CodingKeys.issueDate.rawValue)] = issueDate.fullDateEncoded }
    if let expiryDate { cborMap[.utf8String(CodingKeys.expiryDate.rawValue)] = expiryDate.fullDateEncoded }
    if let codes { cborMap[.utf8String(CodingKeys.codes.rawValue)] = .array(codes.map { $0.toCBOR(options: options) }) }
    return .map(cborMap)
  }
}
