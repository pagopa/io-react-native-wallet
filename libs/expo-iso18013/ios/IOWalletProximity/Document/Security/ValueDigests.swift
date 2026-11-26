//
//  ValueDigests.swift
//  libIso18013
//
//  Created by Antonio on 03/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

 struct ValueDigests {
	public let valueDigests: [String: DigestIDs]
	public subscript(ns: String) -> DigestIDs? { valueDigests[ns] }
	
	public init(valueDigests: [String : DigestIDs]) {
		self.valueDigests = valueDigests
	}
}

extension ValueDigests: CBORDecodable {
	public init?(cbor: CBOR) throws {
    guard case let .map(cborMap) = cbor else {
      return nil
    }
		
    let valueDigests = try cborMap.reduce(into: [String: DigestIDs](), {
      result, keyPair in
      if case .utf8String(let nameSpace) = keyPair.key,
         let digests = try DigestIDs(cbor: keyPair.value) {
        result[nameSpace] = digests
      }
    })
		
    self.valueDigests = valueDigests
	}
}

extension ValueDigests: CBOREncodable {
	public func toCBOR(options: CBOROptions) -> CBOR {
		var m = OrderedDictionary<CBOR, CBOR>()
		for (k,v) in valueDigests {
			m[.utf8String(k)] = v.toCBOR(options: CBOROptions())
		}
		return .map(m)
	}
}
