//
//  ReaderAuthentication.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR

struct ReaderAuthentication {
    let sessionTranscript: SessionTranscript
    let itemsRequestRawData: [UInt8]
}

extension ReaderAuthentication: CBOREncodable {
    public func toCBOR(options: CBOROptions) -> CBOR {
        .array([.utf8String("ReaderAuthentication"), sessionTranscript.toCBOR(options: options), itemsRequestRawData.taggedEncoded])
    }
    
}
