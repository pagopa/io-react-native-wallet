//
//  DeviceRequest.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

 struct DeviceRequest {
	/// The current version
	static let currentVersion = "1.0"
	/// The version requested
    public let version: String
	/// An array of all requested documents.
    public let docRequests: [DocRequest]

    enum Keys: String {
        case version
        case docRequests
    }
}

extension DeviceRequest: CBORDecodable {
    public init?(cbor: CBOR) throws {
        guard case let .map(m) = cbor else { return nil }
        guard case let .utf8String(v) = m[Keys.version] else { return nil }
        version = v
		if v.count == 0 || v.prefix(1) != "1" { return nil }
        guard case let .array(cdrs) = m[Keys.docRequests] else { return nil }
        let drs = try cdrs.compactMap { try DocRequest(cbor: $0) } 
        guard drs.count > 0 else { return nil }
        docRequests = drs
    }
}

extension DeviceRequest: CBOREncodable {
    public func encode(options: CBOROptions) -> [UInt8] { toCBOR(options: options).encode(options: options) }
    
	public func toCBOR(options: CBOROptions) -> CBOR {
		var m = OrderedDictionary<CBOR, CBOR>()
        m[.utf8String(Keys.version.rawValue)] = .utf8String(version)
        m[.utf8String(Keys.docRequests.rawValue)] = .array(docRequests.map { $0.toCBOR(options: options) })
		return .map(m)
	}
}
