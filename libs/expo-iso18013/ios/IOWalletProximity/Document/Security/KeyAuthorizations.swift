//
//  KeyAuthorizations.swift
//  libIso18013
//
//  Created by Antonio on 03/10/24.
//

internal import SwiftCBOR
internal import OrderedCollections

struct KeyAuthorizations {
  let nameSpaces: [String]?
  let dataElements: [String: [String]]?
  
  enum Keys: String {
    case nameSpaces
    case dataElements
  }
}

extension KeyAuthorizations: CBORDecodable {
  init?(cbor: CBOR) {
    guard case let .map(cborMap) = cbor else {
      return nil
    }
    
    var authorizedNameSpaces: [String]? = nil
    
    if case let .array(authorizedNameSpacesList) = cborMap[Keys.nameSpaces] {
      authorizedNameSpaces = authorizedNameSpacesList.compactMap {
        if case let .utf8String(authorizedNameSpace) = $0 {
          return authorizedNameSpace
        } else {
          return nil
        }
      }
      if authorizedNameSpaces?.count == 0 {
        authorizedNameSpaces = nil
      }
    }
    
    nameSpaces = authorizedNameSpaces
    
    var dataElements = [String: [String]]()
    
    if case let .map(dataElementsMap) = cborMap[Keys.dataElements] {
      
      dataElements = dataElementsMap.reduce(into: [String: [String]](), {
        result, keyPair in
        guard case let .utf8String(nameSpace) = keyPair.key,
              case let .array(dataElementsItems) = keyPair.value else {
          return
        }
        
        let dataElementsArray = dataElementsItems.compactMap {
          if case let .utf8String(dataElement) = $0 {
            return dataElement
          } else {
            return nil
          }
        }
        
        guard dataElementsArray.count > 0 else {
          return
        }
        
        result[nameSpace] = dataElementsArray
        
      })
    }
    
    if dataElements.count > 0 {
      self.dataElements = dataElements
    } else {
      self.dataElements = nil
    }
    
  }
}

extension KeyAuthorizations: CBOREncodable {
  public func toCBOR(options: CBOROptions) -> CBOR {
    var cborMap = OrderedDictionary<CBOR, CBOR>()
    
    if let nameSpaces {
      cborMap[.utf8String(Keys.nameSpaces.rawValue)] = .array(nameSpaces.map { .utf8String($0) })
    }
    
    if let dataElements {
      var dataElementsMap = OrderedDictionary<CBOR, CBOR>()
      
      for (key, value) in dataElements {
        dataElementsMap[.utf8String(key)] = .array(value.map { .utf8String($0) })
      }
      
      cborMap[.utf8String(Keys.dataElements.rawValue)] = .map(dataElementsMap)
    }
    
    return .map(cborMap)
  }
}
