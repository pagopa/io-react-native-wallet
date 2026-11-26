//
//  OrderedDictionary+.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

internal import OrderedCollections
internal import SwiftCBOR

import Foundation

extension OrderedDictionary where Key == CBOR {
   subscript<Index: RawRepresentable>(index: Index) -> Value? where Index.RawValue == String {
    self[CBOR(stringLiteral: index.rawValue)]
  }
  
   subscript<Index: RawRepresentable>(index: Index) -> Value? where Index.RawValue == Int {
    self[CBOR(integerLiteral: index.rawValue)]
  }
}

extension OrderedDictionary where Key == String, Value == Any {
  /// get inner string value from dictionary decoded by ``decodeDictionary``
  func getInnerValue(_ path: String) -> String {
    var dict: OrderedDictionary<String, Any>? = self
    let pathComponents = path.components(separatedBy: ".")
    for (i,k) in pathComponents.enumerated() {
      guard dict != nil else { return "" }
      if i == pathComponents.count - 1, let v = dict?[k] { return "\(v)" }
      dict = dict?[k] as? OrderedDictionary<String, Any>
    }
    return ""
  }
  
   func decodeJSON<T: Decodable>(type: T.Type = T.self) -> T? {
       let decoder = JSONDecoder()
    guard let data = try? JSONSerialization.data(withJSONObject: self) else { return nil }
       guard let response = try? decoder.decode(type.self, from: data) else { return nil }
       return response
   }
  
   subscript<Index: RawRepresentable>(index: Index) -> String where Index.RawValue == String {
    getInnerValue(index.rawValue)
  }
}
