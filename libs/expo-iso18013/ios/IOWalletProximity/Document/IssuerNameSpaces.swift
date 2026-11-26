//
//  IssuerNameSpaces.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

 struct IssuerNameSpaces {
  
  public let nameSpaces: [String: [IssuerSignedItem]]
  public subscript(nameSpace: String) -> [IssuerSignedItem]? { nameSpaces[nameSpace] }
  
  public init(nameSpaces: [String: [IssuerSignedItem]]) {
    self.nameSpaces = nameSpaces
  }
}

extension IssuerNameSpaces: CBORDecodable {
  public init?(cbor: CBOR) throws {
    
    guard case let .map(cborMap) = cbor else {
      return nil
    }
    
    let nameSpaces = try cborMap.reduce(into: [String: [IssuerSignedItem]](), {
      result, keyPair in
      
      guard case let .utf8String(nameSpace) = keyPair.key,
            case let .array(cborItems) = keyPair.value else {
        return
      }
      
      let items = try cborItems.compactMap { cborItem -> IssuerSignedItem? in
        guard case let .tagged(itemTag, itemDataCbor) = cborItem,
              itemTag == .encodedCBORDataItem,
              case let .byteString(issuerSignedItemData) = itemDataCbor,
              let issuerSignedItem = try IssuerSignedItem(data: issuerSignedItemData) else {
          return nil
        }
        return issuerSignedItem
      }
      
      result[nameSpace] = items
    })
    
    guard nameSpaces.count > 0 else {
      return nil
    }
    
    self.nameSpaces = nameSpaces
  }
}

extension IssuerNameSpaces: CBOREncodable {
  public func toCBOR(options: CBOROptions) -> CBOR {
    var cborMap = OrderedDictionary<CBOR, CBOR>()
    for (nameSpace, items) in nameSpaces {
      cborMap[.utf8String(nameSpace)] = .array(items.map {
        .tagged(.encodedCBORDataItem, .byteString($0.encode(options: options)))
      })
    }
    return .map(cborMap)
  }
}

