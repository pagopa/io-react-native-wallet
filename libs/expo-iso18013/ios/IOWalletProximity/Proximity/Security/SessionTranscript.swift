//
//  SessionTranscript.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR

 struct SessionTranscript {
	let devEngRawData: [UInt8]?
	let eReaderRawData: [UInt8]?
	let handOver: CBOR
		
	public init(devEngRawData: [UInt8]? = nil, eReaderRawData: [UInt8]? = nil, handOver: CBOR) {
		self.devEngRawData = devEngRawData
		self.eReaderRawData = eReaderRawData
		self.handOver = handOver
	}
}

extension SessionTranscript: CBORDecodable {
    init?(cbor: SwiftCBOR.CBOR) {
        guard case .array(let array) = cbor else { return nil }
        
        if case .null = array[0] {
            devEngRawData = nil
        } else {
            devEngRawData = array[0].decodeTaggedBytes()
        }
        
        if case .null = array[1] {
            eReaderRawData = nil
        } else {
            eReaderRawData = array[1].decodeTaggedBytes()
        }
        
        handOver = array[2]
    }
}

extension SessionTranscript: CBOREncodable {
	public func toCBOR(options: CBOROptions) -> CBOR {
		return .array([devEngRawData?.taggedEncoded ?? CBOR.null, eReaderRawData?.taggedEncoded ?? CBOR.null, handOver])
	}
}
