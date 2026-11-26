//
//  ECCurveName.swift
//  libIso18013
//
//  Created by Antonio on 03/10/24.
//

import CryptoKit
import Foundation
internal import SwiftCBOR

/* Applications MUST check that the curve and the key type are
 consistent and reject a key if they are not.
 
 +---------+-------+----------+------------------------------------+
 | Name    | Value | Key Type | Description                        |
 +---------+-------+----------+------------------------------------+
 | P-256   | 1     | EC2      | NIST P-256 also known as secp256r1 |
 | P-384   | 2     | EC2      | NIST P-384 also known as secp384r1 |
 | P-521   | 3     | EC2      | NIST P-521 also known as secp521r1 |
 | X25519  | 4     | OKP      | X25519 for use w/ ECDH only        |
 | X448    | 5     | OKP      | X448 for use w/ ECDH only          |
 | Ed25519 | 6     | OKP      | Ed25519 for use w/ EdDSA only      |
 | Ed448   | 7     | OKP      | Ed448 for use w/ EdDSA only        |
 +---------+-------+----------+------------------------------------+*/

/// crv: EC identifier - Taken from the "COSE Elliptic Curves" registry
public enum ECCurveName: UInt64 {
  case p256 = 1
  case p384 = 2
  case p521 = 3
  
  //case x25519 = 4
  //case ed25519 = 6
  
  var keyType: ECCurveType {
    switch(self) {
    case .p256, .p384, .p521:
      return .EC2
      //    case .ed25519, .x25519:
      //      return .OKP
    }
  }
}
