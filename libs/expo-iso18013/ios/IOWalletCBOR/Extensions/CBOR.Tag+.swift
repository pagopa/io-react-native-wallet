//
//  CBOR.Tag+.swift
//  cbor
//
//  Created by Antonio on 02/12/24.
//



internal import SwiftCBOR

/// COSE Message Identification
extension CBOR.Tag {
    /// Tagged Date, Tag 1004 is specified in RFC 8943
    static let fullDateItem = CBOR.Tag(rawValue: 1004)
}
