//
//  RequestNameSpaces.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

/// contains the requested data elements and the namespace they belong to.
 struct RequestNameSpaces {
    public let nameSpaces: [String: RequestDataElements]
    public subscript(ns: String)-> RequestDataElements? { nameSpaces[ns] }
} 

 
extension RequestNameSpaces: CBORDecodable {
	public init?(cbor: CBOR) throws {
  		guard case let .map(e) = cbor else { return nil }
		let dePairs = e.compactMap { (k: CBOR, v: CBOR) -> (String, RequestDataElements)?  in
			guard case .utf8String(let ns) = k else { return nil }
			guard let rde = RequestDataElements(cbor: v) else { return nil }
			return (ns, rde)
		}      
        let de = Dictionary(dePairs, uniquingKeysWith: { (first, _) in first })
		if de.count == 0 { return nil }
		nameSpaces = de
    }
}

extension RequestNameSpaces: CBOREncodable {
	public func toCBOR(options: CBOROptions) -> CBOR {
		let m = nameSpaces.map { (ns: String, rde: RequestDataElements) -> (CBOR, CBOR) in
			(.utf8String(ns), rde.toCBOR(options: options))
		}
		return .map(OrderedDictionary(m, uniquingKeysWith: { (d, _) in d }))
	}
}
