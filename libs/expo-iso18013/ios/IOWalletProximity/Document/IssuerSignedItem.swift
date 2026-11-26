//
//  IssuerSignedItem.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//


import Foundation
internal import SwiftCBOR
internal import OrderedCollections

 struct IssuerSignedItem {
  public let digestID: UInt64
  let random: [UInt8]
  public let elementIdentifier: String
  public let elementValue: CBOR
  public var rawData: [UInt8]?
  
  enum Keys: String {
    case digestID
    case random
    case elementIdentifier
    case elementValue
  }
     
     init(digestID: UInt64, random: [UInt8], elementIdentifier: String, elementValue: CBOR, rawData: [UInt8]? = nil) throws {
         
         if !(digestID <= Int32.max) {
            //MARK: The value shall be smaller than 2^31. (ISO18013-5 page 60)
             throw ErrorHandler.digestIdOutOfRange
         }
         
         self.digestID = digestID
         self.random = random
         self.elementIdentifier = elementIdentifier
         self.elementValue = elementValue
         self.rawData = rawData
     }
}

extension IssuerSignedItem: CBORDecodable {
  public init?(data: [UInt8]) throws {
    guard let cbor = try? CBOR.decode(data) else { return nil }
    try self.init(cbor: cbor)
    rawData = data
  }
  
  public init?(cbor: CBOR) throws {
    guard case .map(let cborMap) = cbor else {
      return nil
    }
    guard case .unsignedInt(let digestID) = cborMap[Keys.digestID] else {
      return nil
    }
      
      if !(digestID <= Int32.max) {
         //MARK: The value shall be smaller than 2^31. (ISO18013-5 page 60)
          throw ErrorHandler.digestIdOutOfRange
      }
      
      
    self.digestID = digestID
    guard case .byteString(let random) = cborMap[Keys.random] else {
      return nil
    }
    self.random = random
    guard case .utf8String(let elementIdentifier) = cborMap[Keys.elementIdentifier] else {
      return nil
    }
    self.elementIdentifier = elementIdentifier
    guard let elementValue = cborMap[Keys.elementValue] else {
      return nil
    }
    self.elementValue = elementValue
  }
}

extension IssuerSignedItem: CBOREncodable {
  public func encode(options: CBOROptions) -> [UInt8] {
    if let rawData { return rawData }
    return toCBOR(options: CBOROptions()).encode()
  }
  
  public func toCBOR(options: CBOROptions) -> CBOR {
    var cbor = OrderedDictionary<CBOR, CBOR>()
    cbor[.utf8String(Keys.digestID.rawValue)] = .unsignedInt(digestID)
    cbor[.utf8String(Keys.random.rawValue)] = .byteString(random)
    cbor[.utf8String(Keys.elementIdentifier.rawValue)] = .utf8String(elementIdentifier)
    cbor[.utf8String(Keys.elementValue.rawValue)] = elementValue
    return .map(cbor)
  }
}

extension IssuerSignedItem: CustomStringConvertible {
  public var description: String { elementValue.description }
}

extension IssuerSignedItem: CustomDebugStringConvertible {
  public var debugDescription: String { elementValue.debugDescription }
}

extension IssuerSignedItem {
  public var mdocDataType: MdocDataType? { elementValue.mdocDataType }
}

extension IssuerSignedItem {
  public func getTypedValue<T>() -> T? { elementValue.getTypedValue() }
}
