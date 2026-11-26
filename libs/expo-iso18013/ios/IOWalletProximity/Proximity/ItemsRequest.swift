//
//  ItemsRequest.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

 struct ItemsRequest {
	/// Requested document type.
    public let docType: String
	/// Requested data elements for each NameSpace
    public let requestNameSpaces: RequestNameSpaces
	/// May be used by the mdoc reader to provide additional information
    let requestInfo: CBOR?

    enum Keys: String {
        case docType
        case nameSpaces
        case requestInfo
    }
}

extension ItemsRequest: CBORDecodable {
    public init?(cbor: CBOR) throws {
        guard case let .map(m) = cbor else { return nil }
        guard case let .utf8String(dt) = m[Keys.docType] else { return nil }
        docType = dt
        guard let cns = m[Keys.nameSpaces], let ns = try RequestNameSpaces(cbor: cns)  else { return nil }
        requestNameSpaces = ns
        requestInfo = m[Keys.requestInfo]
    }
}

extension ItemsRequest: CBOREncodable {
	public func toCBOR(options: CBOROptions) -> CBOR {
		var m = OrderedDictionary<CBOR, CBOR>()
        m[.utf8String(Keys.docType.rawValue)] = .utf8String(docType)
        m[.utf8String(Keys.nameSpaces.rawValue)] = requestNameSpaces.toCBOR(options: options)
        if let requestInfo { m[.utf8String(Keys.requestInfo.rawValue)] = requestInfo }
		return .map(m)
	}
}
