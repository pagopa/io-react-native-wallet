//
//  CoseTag.swift
//  libIso18013
//
//  Created by Antonio on 03/10/24.
//


internal import SwiftCBOR

/// COSE Message Identification
extension CBOR.Tag {
  /// Tagged COSE Sign1 Structure
   static let coseSign1Item = CBOR.Tag(rawValue: 18)
  /// Tagged COSE Mac0 Structure
   static let coseMac0Item = CBOR.Tag(rawValue: 17)
}
