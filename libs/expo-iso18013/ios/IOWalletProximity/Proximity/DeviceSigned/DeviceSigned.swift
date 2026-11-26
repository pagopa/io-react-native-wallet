//
//  DeviceSigned.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

/// Contains the mdoc authentication structure and the data elements protected by mdoc authentication
struct DeviceSigned {
	let nameSpaces: DeviceNameSpaces
	let nameSpacesRawData: [UInt8]
	let deviceAuth: DeviceAuth
	//DeviceNameSpacesBytes = #6.24(bstr .cbor DeviceNameSpaces)
	enum Keys: String {
		case nameSpaces
		case deviceAuth
	}
	
	public init(deviceAuth: DeviceAuth) {
		nameSpaces = DeviceNameSpaces(deviceNameSpaces: [:])
		nameSpacesRawData = CBOR.map([:]).encode()
		self.deviceAuth = deviceAuth
	}
}

extension DeviceSigned: CBORDecodable {
	public init?(cbor: CBOR) throws {
		guard case let .map(m) = cbor else { return nil }
		guard case let .tagged(t, cdns) = m[Keys.nameSpaces], t == .encodedCBORDataItem, case let .byteString(bs) = cdns, let dns = try DeviceNameSpaces(data: bs) else { return nil }
		nameSpaces = dns
		guard let cdu = m[Keys.deviceAuth], let du = try DeviceAuth(cbor: cdu) else { return nil }
		deviceAuth = du
		nameSpacesRawData = bs
	}
}

extension DeviceSigned: CBOREncodable {
	public func toCBOR(options: CBOROptions) -> CBOR {
		var cbor = OrderedDictionary<CBOR, CBOR>()
		cbor[.utf8String(Keys.nameSpaces.rawValue)] = nameSpacesRawData.taggedEncoded
		cbor[.utf8String(Keys.deviceAuth.rawValue)] = deviceAuth.toCBOR(options: options)
		return .map(cbor)
	}
}
