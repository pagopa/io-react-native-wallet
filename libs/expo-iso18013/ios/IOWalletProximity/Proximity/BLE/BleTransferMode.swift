//
//  BleTransferMode.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

internal import SwiftCBOR

 enum BleTransferMode {
	case server
	case client
    static let START_REQUEST: [UInt8] = [0x01]
	static let END_REQUEST: [UInt8] = [0x02]
	static let START_DATA: [UInt8] = [0x01]
	static let END_DATA: [UInt8] = [0x00]
	public static let BASE_UUID_SUFFIX_SERVICE = "-0000-1000-8000-00805F9B34FB"
	public static let QRHandover = CBOR.null
}
