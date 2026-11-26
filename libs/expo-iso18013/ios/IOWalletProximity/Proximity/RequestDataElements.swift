//
//  RequestDataElements.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

public typealias IntentToRetain = Bool

/// Requested data elements identified by their data element identifier.
struct RequestDataElements {
	/// IntentToRetain indicates whether the mdoc verifier intends to retain the received data element
    public let dataElements: [String: IntentToRetain]
    public var elementIdentifiers: [String] { Array(dataElements.keys) }
}

extension RequestDataElements: CBORDecodable {
    init?(cbor: CBOR) {
  		guard case let .map(e) = cbor else { return nil }
		let dePairs = e.compactMap { (k: CBOR, v: CBOR) -> (String, Bool)?  in
			guard case .utf8String(let dei) = k else { return nil }
			guard case .boolean(let ir) = v else { return nil }
			return (dei, ir)
		}      
        let de = Dictionary(dePairs, uniquingKeysWith: { (first, _) in first })
		if de.count == 0 { return nil }
		dataElements = de
    }
}

extension RequestDataElements: CBOREncodable {
    public func toCBOR(options: CBOROptions) -> CBOR {
		let m = dataElements.map { (dei: String, ir: IntentToRetain) -> (CBOR, CBOR) in
			(.utf8String(dei), .boolean(ir))
		}
		return .map(OrderedDictionary(m, uniquingKeysWith: { (d, _) in d }))
	}
}
