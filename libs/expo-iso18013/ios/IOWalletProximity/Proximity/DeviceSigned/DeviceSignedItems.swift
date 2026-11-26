//
//  DeviceSignedItems.swift
//  libIso18013
//
//  Created by Antonio Caparello on 17/10/24.
//

internal import SwiftCBOR

/// Contains the data element identifiers and values for a namespace
 struct DeviceSignedItems {
	public let deviceSignedItems: [String: CBOR]
	public subscript(ei: String) -> CBOR? { deviceSignedItems[ei] }
}

extension DeviceSignedItems: CBORDecodable {
	public init?(cbor: CBOR) throws {
		guard case let .map(m) = cbor else { return nil }
		let dsiPairs = m.compactMap { (k: CBOR, v: CBOR) -> (String, CBOR)?  in
			guard case .utf8String(let dei) = k else { return nil }
			return (dei,v)
		}
		let dsi = Dictionary(dsiPairs, uniquingKeysWith: { (first, _) in first })
		if dsi.count == 0 { return nil }
		deviceSignedItems = dsi
	}
}
