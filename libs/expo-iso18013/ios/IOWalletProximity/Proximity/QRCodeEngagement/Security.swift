//
//  Security.swift
//  libIso18013
//
//  Created by Martina D'urso on 15/10/24.
//

import Foundation
internal import SwiftCBOR

struct Security {
    // Cipher suite identifier used in the encoding
    static let cipherSuiteIdentifier: UInt64 = 1
    // Private key for holder only
    var d: [UInt8]?
    // Security struct for the holder (only the public key of the mDL is encoded)
    let deviceKey: CoseKey
     
}

// Extension to make Security conform to CBOREncodable
extension Security: CBOREncodable {
    // Converts the Security instance to CBOR representation
    func toCBOR(options: CBOROptions) -> CBOR {
        // Encodes the cipher suite identifier and device key into a CBOR array
        CBOR.array([.unsignedInt(Self.cipherSuiteIdentifier), deviceKey.taggedEncoded])
    }
}

// Extension to make Security conform to CBORDecodable
extension Security: CBORDecodable {
    // Initializes a Security instance from a CBOR representation
    init?(cbor: CBOR) {
        // Ensure the CBOR is an array with at least two elements
        guard case let .array(arr) = cbor, arr.count > 1 else { return nil }
        // Extract the cipher suite identifier and verify it matches
        guard case let .unsignedInt(v) = arr[0], v == Self.cipherSuiteIdentifier else { return nil }
        // Decode the device key from the CBOR representation
        guard let ck = arr[1].decodeTagged(CoseKey.self) else { return nil }
        deviceKey = ck
    }
}
