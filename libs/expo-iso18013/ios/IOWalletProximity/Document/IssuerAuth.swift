//
//  IssuerAuth.swift
//  libIso18013
//
//  Created by Antonio on 03/10/24.
//


import Foundation
internal import SwiftCBOR

struct IssuerAuth {
  public let mobileSecurityObject: MobileSecurityObject
  public let mobileSecurityObjectRawData: [UInt8]
  
  public let verifyAlgorithm: Cose.VerifyAlgorithm
  public let signature: Data
  public let issuerAuthCertificateAuthorities: [[UInt8]]
  
  public init(mobileSecurityObject: MobileSecurityObject,
              mobileSecurityObjectRawData: [UInt8],
              verifyAlgorithm: Cose.VerifyAlgorithm,
              signature: Data,
              issuerAuthCertificateAuthorities: [[UInt8]]) {
    
    self.mobileSecurityObject = mobileSecurityObject
    self.mobileSecurityObjectRawData = mobileSecurityObjectRawData
    self.verifyAlgorithm = verifyAlgorithm
    self.signature = signature
    self.issuerAuthCertificateAuthorities = issuerAuthCertificateAuthorities
  }
}

// Encoded as `Cose` ( COSE Sign1). The payload is the MSO
extension IssuerAuth: CBORDecodable {
  
  public init?(cbor: CBOR) throws {
    guard let cose = Cose(type: .sign1, cbor: cbor) else {
      return nil
    }
    
    guard case let .byteString(mobileSecurityObjectRawData) = cose.payload,
          let mobileSecurityObject = try MobileSecurityObject(data: mobileSecurityObjectRawData),
          let verifyAlgorithm = cose.verifyAlgorithm else {
      return nil
    }
    
    self.mobileSecurityObject = mobileSecurityObject
    self.mobileSecurityObjectRawData = mobileSecurityObjectRawData
    self.verifyAlgorithm = verifyAlgorithm
    self.signature = cose.signature
    
    guard let coseUnprotectedHeadersCbor = cose.unprotectedHeader?.rawHeader,
          case let .map(coseUnprotectedHeaders) = coseUnprotectedHeadersCbor  else {
      return nil
    }
    
    if case let .byteString(issuerAuthCertificateAuthority) = coseUnprotectedHeaders[.unsignedInt(33)] {
      self.issuerAuthCertificateAuthorities = [issuerAuthCertificateAuthority]
    }
    else if case let .array(issuerAuthCertificateAuthorityList) = coseUnprotectedHeaders[.unsignedInt(33)] {
      self.issuerAuthCertificateAuthorities = issuerAuthCertificateAuthorityList.compactMap {
        if case let .byteString(issuerAuthCertificateAuthority) = $0 {
          return issuerAuthCertificateAuthority
        } else {
          return nil
        }
      }
    }
    else {
      return nil
    }
  }
}

extension IssuerAuth: CBOREncodable {
  public func toCBOR(options: CBOROptions) -> CBOR {
    
    let unprotectedHeaderCbor = CBOR.map([
      .unsignedInt(33):
        issuerAuthCertificateAuthorities.count == 1 ? CBOR.byteString(issuerAuthCertificateAuthorities[0]) :
        CBOR.array(issuerAuthCertificateAuthorities.map { CBOR.byteString($0) })
    ])
    
    let cose = Cose(type: .sign1,
                    algorithm: verifyAlgorithm.rawValue,
                    payloadData: Data(mobileSecurityObjectRawData),
                    unprotectedHeaderCbor:  unprotectedHeaderCbor,
                    signature: signature)
    
    return cose.toCBOR(options: options)
  }
}
