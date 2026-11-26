//
//  CRL.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftASN1
internal import X509

/// Represents a Certificate Revocation List (CRL) used to indicate revoked certificates
struct CRL: PEMParseable, DERParseable {
    // The serial number of the CRL
    var serialNumber: Int64
    
    // The issuer of the CRL
    var issuer: DistinguishedName
    
    // The validity date of the CRL
    var validity: UTCTime
    
    // The subject's expiration date of the CRL
    var subject: UTCTime
    
    // List of revoked serial numbers in the CRL
    var revokedSerials: [CRLSerialInfo] = []
    
    // Default discriminator for PEM parsing
    static let defaultPEMDiscriminator: String = "X509 CRL"
    
    /// Represents information about a revoked certificate serial number
    struct CRLSerialInfo: DERImplicitlyTaggable, CustomStringConvertible {
        // The serial number of the revoked certificate
        let serial: Certificate.SerialNumber
        
        // The revocation date of the certificate
        let date: UTCTime
        
        /// Initializes a `CRLSerialInfo` instance from a DER-encoded ASN1 node
        /// - Parameters:
        ///   - derEncoded: The DER-encoded ASN1 node
        ///   - identifier: The identifier for this ASN1 structure
        init(derEncoded: SwiftASN1.ASN1Node, withIdentifier identifier: SwiftASN1.ASN1Identifier) throws {
            // Extract the serial number and revocation date from the nodes
            guard case .constructed(let nodes) = derEncoded.content else { throw CRL.toError(node: derEncoded) }
            var nodesIter = nodes.makeIterator()
            let snBytes = try ArraySlice<UInt8>(derEncoded: &nodesIter)
            serial = Certificate.SerialNumber(bytes: snBytes)
            date = try UTCTime(derEncoded: &nodesIter)
        }
        
        // Default identifier for this structure is `.sequence`
        static let defaultIdentifier: SwiftASN1.ASN1Identifier = .sequence
        
        /// Serialization is not used in this implementation
        func serialize(into coder: inout SwiftASN1.DER.Serializer, withIdentifier identifier: SwiftASN1.ASN1Identifier) throws { }
        
        // Provides a description for the CRLSerialInfo
        var description: String { serial.description }
    }
    
    /// Initializes a `CRL` instance from a DER-encoded ASN1 node
    /// - Parameter node: The ASN1 node containing CRL data
    init(derEncoded node: SwiftASN1.ASN1Node) throws {
        // Extract nodes from the constructed ASN1 content
        guard case .constructed(let nodes) = node.content else { throw Self.toError(node: node) }
        var nodesIter = nodes.makeIterator()
        
        // Extract the serial number of the CRL
        guard let n1 = nodesIter.next() else { throw Self.toError(node: node) }
        guard case .constructed(let nodes1) = n1.content else { throw Self.toError(node: n1) }
        var nodes1Iter = nodes1.makeIterator()
        serialNumber = try Int64(derEncoded: &nodes1Iter)
        
        // Skip the signature node
        _ = nodes1Iter.next()
        
        // Extract the issuer name
        issuer = try DistinguishedName(derEncoded: &nodes1Iter)
        
        // Extract the validity and subject expiration dates
        validity = try SwiftASN1.UTCTime(derEncoded: &nodes1Iter)
        subject = try SwiftASN1.UTCTime(derEncoded: &nodes1Iter)
        
        // Extract the revoked serial numbers from the CRL
        guard let n2 = nodes1Iter.next() else { throw Self.toError(node: n1) }
        guard case .constructed(let nodes3) = n2.content else { throw Self.toError(node: n2) }
        revokedSerials = nodes3.compactMap { try? CRLSerialInfo(derEncoded: $0) }
    }
    
    /// Generates an error for invalid ASN1 nodes
    /// - Parameter node: The ASN1 node causing the error
    /// - Returns: An NSError with information about the invalid node
    static func toError(node: SwiftASN1.ASN1Node) -> NSError {
        NSError(domain: "CRL", code: 0, userInfo: [NSLocalizedDescriptionKey : "Invalid node \(node.identifier.description)"])
    }
}

/// Represents an entry in the CRL, containing the serial number and revocation date
struct CRLEntry {
    // The serial number of the revoked certificate
    let certificateSerialNumber: String
    
    // The date when the certificate was revoked
    let revocationDate: Date
}
