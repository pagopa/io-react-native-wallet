//
//  Dictionary+.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

internal import SwiftCBOR
import Foundation

extension Dictionary where Key == CBOR {
   subscript<Index: RawRepresentable>(index: Index) -> Value? where Index.RawValue == String {
    self[CBOR(stringLiteral: index.rawValue)]
  }
  
   subscript<Index: RawRepresentable>(index: Index) -> Value? where Index.RawValue == Int {
    self[CBOR(integerLiteral: index.rawValue)]
  }
}

extension Dictionary where Key == String, Value == Any {
  func getInnerValue(_ path: String) -> String {
    var dict: [String:Any]? = self
    let pathComponents = path.components(separatedBy: ".")
    for (i,k) in pathComponents.enumerated() {
      guard dict != nil else { return "" }
      if i == pathComponents.count - 1, let v = dict?[k] { return "\(v)" }
      dict = dict?[k] as? [String:Any]
    }
    return ""
  }
  
  public func decodeJSON<T: Decodable>(type: T.Type = T.self) -> T? {
       let decoder = JSONDecoder()
    guard let data = try? JSONSerialization.data(withJSONObject: self) else { return nil }
       guard let response = try? decoder.decode(type.self, from: data) else { return nil }
       return response
   }
  
  public subscript<Index: RawRepresentable>(index: Index) -> String where Index.RawValue == String {
    getInnerValue(index.rawValue)
  }
}
