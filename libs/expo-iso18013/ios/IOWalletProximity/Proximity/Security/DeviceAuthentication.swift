//
//  DeviceAuthentication.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR

 struct DeviceAuthentication {
    let sessionTranscript: SessionTranscript
    let docType: String
    let deviceNameSpacesRawData: [UInt8]
}

extension DeviceAuthentication: CBOREncodable {
    public func toCBOR(options: CBOROptions) -> CBOR {
        .array([.utf8String("DeviceAuthentication"), sessionTranscript.toCBOR(options: options), .utf8String(docType), deviceNameSpacesRawData.taggedEncoded])
    }
}
