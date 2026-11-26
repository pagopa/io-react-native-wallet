//
//  SessionEstablishment.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

/// The mdoc reader creates the session establishment message.Contains the reader key and the encrypted mdoc request.
/// The mdoc uses the data from the session establishment message to derive the session keys and decrypt the mdoc request.
struct SessionEstablishment {
	public var eReaderKeyRawData: [UInt8]?
	public let data: [UInt8]
	
	enum CodingKeys: String, CodingKey {
		case eReaderKey
		case data
	}
	public var eReaderKey: CoseKey? {
		if let eReaderKeyRawData {
			return try? CoseKey(data: eReaderKeyRawData) } else { return nil }
	}
}

extension SessionEstablishment: CBORDecodable {
	public init?(cbor: CBOR) throws {
        guard case let .map(m) = cbor else {
            return nil
        }
        guard case let .byteString(bs) = m[.utf8String(CodingKeys.data.rawValue)] else {
            return nil
        }
		data = bs
		if let eReaderKey = m[.utf8String(CodingKeys.eReaderKey.rawValue)] {
			guard case let .tagged(tag, value) = eReaderKey else {
                return nil
            }
            guard tag == .encodedCBORDataItem else {
                return nil
            }
            guard case let .byteString(ebs) = value else {
                return nil
            }
			eReaderKeyRawData = ebs
        } else {
            eReaderKeyRawData = nil
        }
	}
}

extension SessionEstablishment: CBOREncodable {
	public func toCBOR(options: CBOROptions) -> CBOR {
		var res = OrderedDictionary<CBOR, CBOR>()
		if let eReaderKeyRawData { res[.utf8String(CodingKeys.eReaderKey.rawValue)] = eReaderKeyRawData.taggedEncoded }
		res[.utf8String(CodingKeys.data.rawValue)] = .byteString(data)
		return .map(res)
	}
}

