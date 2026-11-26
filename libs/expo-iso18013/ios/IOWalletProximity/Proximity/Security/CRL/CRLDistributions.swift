//
//  CRLDistributions.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

internal import SwiftASN1
internal import X509

/// Wrapper for CRL (Certificate Revocation List) distributions
 struct CRLDistributions {
    // List of CRL distribution points
    public var crls: [CRLDistribution] = []
}

extension CRLDistributions: DERImplicitlyTaggable {
    /// Serialization is not needed for this implementation
    public func serialize(into coder: inout SwiftASN1.DER.Serializer, withIdentifier identifier: SwiftASN1.ASN1Identifier) throws { }
    
    /// Default identifier for this structure is `.sequence`
    public static var defaultIdentifier: SwiftASN1.ASN1Identifier { .sequence }
    
    /// Initializes a `CRLDistributions` instance from a DER-encoded ASN1 node
    /// - Parameters:
    ///   - rootNode: The ASN1 root node containing CRL distribution data
    ///   - identifier: The identifier for this ASN1 structure
    public init(derEncoded rootNode: ASN1Node, withIdentifier identifier: SwiftASN1.ASN1Identifier) throws {
        // Extract the sequence of CRLDistribution points from the root node
        crls = try DER.sequence(of: CRLDistribution.self, identifier: identifier, rootNode: rootNode)
    }
}

/// Represents a CRL distribution point
 struct CRLDistribution {
    // The URL of the CRL distribution point
    let distributionPoint: String
    
    // Check if the distribution point is not empty
    var isNotEmpty: Bool { !distributionPoint.isEmpty }
}

extension CRLDistribution: DERImplicitlyTaggable {
    /// Serialization is not needed for this implementation
     func serialize(into coder: inout SwiftASN1.DER.Serializer, withIdentifier identifier: SwiftASN1.ASN1Identifier) throws { }
    
    /// Default identifier for this structure is `.sequence`
     static var defaultIdentifier: SwiftASN1.ASN1Identifier { .sequence }
    
    /// Initializes a `CRLDistribution` instance from a DER-encoded ASN1 node
    /// - Parameters:
    ///   - rootNode: The ASN1 root node containing the CRL distribution point data
    ///   - identifier: The identifier for this ASN1 structure
     init(derEncoded rootNode: ASN1Node, withIdentifier identifier: SwiftASN1.ASN1Identifier) throws {
        // Parse the ASN1 node to extract the URL for the CRL distribution point
        self = try DER.sequence(rootNode, identifier: identifier) { nodes in
            guard let firstNode = nodes.next(),
                  case let .constructed(contentNode) = firstNode.content,
                  let innerNode = contentNode.first(where: { _ in true }),
                  case let .constructed(deeperContentNode) = innerNode.content,
                  let urlNode = deeperContentNode.first(where: { _ in true }),
                  let generalName = try? GeneralName(derEncoded: urlNode),
                  case let .uniformResourceIdentifier(url) = generalName else {
                return CRLDistribution(distributionPoint: "")
            }
            return CRLDistribution(distributionPoint: url)
        }
    }
}
