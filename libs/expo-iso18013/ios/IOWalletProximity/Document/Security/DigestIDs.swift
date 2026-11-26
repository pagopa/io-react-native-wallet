//
//  DigestIDs.swift
//  libIso18013
//
//  Created by Antonio on 03/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

 struct DigestIDs {
  public let digestIDs: [UInt64: [UInt8]]
  public subscript(digestID: UInt64) -> [UInt8]? { digestIDs[digestID] }
  
  public init(digestIDs: [UInt64 : [UInt8]]) throws {
      
      if !digestIDs.allSatisfy({
          $0.key <= Int32.max
      }) {
         //MARK: The value shall be smaller than 2^31. (ISO18013-5 page 60)
          throw ErrorHandler.digestIdOutOfRange
            
      }
      
    self.digestIDs = digestIDs
  }
  
}

extension DigestIDs: CBORDecodable {
  public init?(cbor: CBOR) throws {
    
    guard case let .map(cborMap) = cbor else {
      return nil
    }
    
    let digests = cborMap.reduce(into: [UInt64: [UInt8]](), {
      result, keyPair in
      if case .unsignedInt(let digestId) = keyPair.key,
         case .byteString(let digestValue) = keyPair.value {
        result[digestId] = digestValue
      }
    })
    
    guard digests.count > 0 else  {
      return nil
    }
      
      if !digests.allSatisfy({
          $0.key <= Int32.max
      }) {
         //MARK: The value shall be smaller than 2^31. (ISO18013-5 page 60)
          throw ErrorHandler.digestIdOutOfRange
      }
    
    self.digestIDs = digests
  }
}

extension DigestIDs: CBOREncodable {
  public func toCBOR(options: CBOROptions) -> CBOR {
    var cborMap = OrderedDictionary<CBOR, CBOR>()
    
    for (key, value) in digestIDs {
      cborMap[.unsignedInt(key)] = .byteString(value)
    }
    
    return .map(cborMap)
  }
}

