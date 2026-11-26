//
//  DeviceAuth.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

/// contains either the DeviceSignature or the DeviceMac element
struct DeviceAuth {
	let coseMacOrSignature: Cose
	enum Keys: String {
		case deviceSignature
		case deviceMac
	}
	
	public init(coseMacOrSignature: Cose) {
		self.coseMacOrSignature = coseMacOrSignature
	}
}

extension DeviceAuth: CBORDecodable {
	public init?(cbor: CBOR) throws {
		guard case let .map(m) = cbor else { return nil }
		if let cs = m[Keys.deviceSignature] {
			if let ds = Cose(type: .sign1, cbor: cs) { coseMacOrSignature = ds } else { return nil }
		} else if let cm = m[Keys.deviceMac] {
			if let dm = Cose(type: .mac0, cbor: cm) { coseMacOrSignature = dm } else { return nil }
		} else { return nil }
	}
}

extension DeviceAuth: CBOREncodable {
	public func toCBOR(options: CBOROptions) -> CBOR {
		var m = OrderedDictionary<CBOR, CBOR>()
		let cborMS = coseMacOrSignature.toCBOR(options: options)
		switch coseMacOrSignature.type {
		case .sign1: m[.utf8String(Keys.deviceSignature.rawValue)] = cborMS
		case .mac0: m[.utf8String(Keys.deviceMac.rawValue)] = cborMS
		}
		return CBOR.map(m)
	}
}
