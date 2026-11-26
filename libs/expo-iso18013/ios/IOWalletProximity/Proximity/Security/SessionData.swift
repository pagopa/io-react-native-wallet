//
//  SessionData.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

/// Message data transfered between mDL and mDL reader
 struct SessionData {
	
	public let data: [UInt8]?
	public let status: UInt64?
	
	enum CodingKeys: String, CodingKey {
		case data
		case status
	}

	public init(cipher_data: [UInt8]? = nil, status: UInt64? = nil) {
		self.data = cipher_data
		self.status = status
	}
}

extension SessionData: CBORDecodable {
	public init?(cbor: CBOR) throws {
        guard case let .map(values) = cbor else {
            return nil
        }
        if case let .unsignedInt(s) = values[.utf8String(CodingKeys.status.rawValue)] {
            status = s
        } else {
            status = nil
        }
        if case let .byteString(bs) = values[.utf8String(CodingKeys.data.rawValue)] {
            data = bs
        } else {
            data = nil
        }
	}
}

extension SessionData: CBOREncodable {
	public func toCBOR(options: CBOROptions) -> CBOR {
		var res = OrderedDictionary<CBOR, CBOR>()
		if let st = status { res[CBOR.utf8String(CodingKeys.status.rawValue)] = CBOR.unsignedInt(st) }
		if let d = data { res[CBOR.utf8String(CodingKeys.data.rawValue)] = CBOR.byteString(d) }
		return .map(res)
	}
}


