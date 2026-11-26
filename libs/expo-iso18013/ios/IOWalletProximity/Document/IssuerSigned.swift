//
//  IssuerSigned.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//


import Foundation
internal import SwiftCBOR
internal import OrderedCollections

// Struct representing IssuerSigned, containing optional IssuerNameSpaces
struct IssuerSigned {
  public let issuerNameSpaces: IssuerNameSpaces?
  public let issuerAuth: IssuerAuth?
  
  enum Keys: String {
    case nameSpaces
    case issuerAuth
  }
  
  // Initializer for IssuerSigned
  // - Parameter issuerNameSpaces: Optional IssuerNameSpaces associated with the issuer
  // - Parameter issuerAuth: Optional IssuerAuth associated with the issuer
  public init(issuerNameSpaces: IssuerNameSpaces?, issuerAuth: IssuerAuth?) {
    self.issuerNameSpaces = issuerNameSpaces
    self.issuerAuth = issuerAuth
  }
}

// Extension to make IssuerSigned conform to CBORDecodable
extension IssuerSigned: CBORDecodable {
    
    // Initializes IssuerSigned from a CBOR object
    // - Parameter cbor: The CBOR object representing the issuer-signed data
    public init?(cbor: CBOR) throws {
        // Ensure the CBOR object is a map
        guard case let .map(cborMap) = cbor else {
            return nil
        }
        
        // Attempt to extract IssuerNameSpaces from the CBOR map
        if let issuerNameSpaceCbor = cborMap[Keys.nameSpaces] {
            issuerNameSpaces = try IssuerNameSpaces(cbor: issuerNameSpaceCbor)
        } else {
            issuerNameSpaces = nil
        }

        if let issuerAuthCbor = cborMap[Keys.issuerAuth],
          let issuerAuth = try IssuerAuth(cbor: issuerAuthCbor) {
      self.issuerAuth = issuerAuth
    }
    else {
      self.issuerAuth = nil
    }
    }
}

// Extension to make IssuerSigned conform to CBOREncodable
extension IssuerSigned: CBOREncodable {
    
    // Encodes IssuerSigned into a CBOR object
    // - Parameter options: Encoding options for CBOR
    // - Returns: A CBOR object representing the encoded IssuerSigned data
    public func toCBOR(options: CBOROptions) -> CBOR {
        var cbor = OrderedDictionary<CBOR, CBOR>()
        
        // Encode IssuerNameSpaces if they exist
        if let issuerNameSpaces = issuerNameSpaces {
            cbor[.utf8String(Keys.nameSpaces.rawValue)] = issuerNameSpaces.toCBOR(options: options)
        }
        
        //Encode IssuerAuth if exists
         if let issuerAuth = issuerAuth {
      cbor[.utf8String(Keys.issuerAuth.rawValue)] = issuerAuth.toCBOR(options: options)
    }
    
    return .map(cbor)

        // Return the encoded CBOR map
        return .map(cbor)
    }
}
    
extension IssuerSigned {
  public func validateSignature() -> Bool {
    
    guard let issuerAuthCertificateAuthoritiesPublicKeys = self.issuerAuth?.issuerAuthCertificateAuthorities.compactMap({
      return SecCertificateCreateWithData(nil, Data($0) as CFData)?.getPublicKey()
    }) else {
      return false
    }
    
    guard let issuerAuthCose = Cose(type: .sign1, cbor: self.issuerAuth.toCBOR(options: CBOROptions())) else {
      return false
    }
    
    
    for issuerAuthCertificateAuthoritiesPublicKey in issuerAuthCertificateAuthoritiesPublicKeys {
      let isValidSignature = try? issuerAuthCose.validateCoseSign1(publicKey_x963: issuerAuthCertificateAuthoritiesPublicKey)
      if (isValidSignature == true) {
        return true;
      }
    }
    
    return false;
  }
}


