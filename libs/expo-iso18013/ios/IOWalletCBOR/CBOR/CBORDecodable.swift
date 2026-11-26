//
//  CBORDecodable.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

internal import SwiftCBOR

// Protocol for types that can be decoded from a CBOR object
protocol CBORDecodable {
    init?(cbor: CBOR) throws
}

// Extension providing a default implementation for decoding from raw data
extension CBORDecodable {
    
    // Initializer that decodes raw byte data into a CBOR object and then attempts to initialize the conforming type
    // - Parameter data: The raw CBOR byte data
    public init?(data: [UInt8]) throws {
        guard let decodedObject = try? CBOR.decode(data) else {
            return nil
        }
        try self.init(cbor: decodedObject)
    }
}
