//
//  String+CBOR.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

internal import SwiftCBOR

// Extension to add CBOR encoding utilities for String
extension String {
    
    // Computed property to encode the string as a tagged CBOR value for full dates
    var fullDateEncoded: CBOR {
        // Tag the string with the custom tag (1004) and encode it as a CBOR utf8String
        return CBOR.tagged(CBOR.Tag(rawValue: 1004), .utf8String(self))
    }
}
