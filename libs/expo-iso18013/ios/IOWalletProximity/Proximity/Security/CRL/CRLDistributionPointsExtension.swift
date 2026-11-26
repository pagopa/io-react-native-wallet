//
//  CRLDistributionPointsExtension.swift
//  libIso18013
//
//  Created by Antonio Caparello on 17/10/24.
//

internal import X509
internal import SwiftASN1

 struct CRLDistributionPointsExtension {
	public var crls: [CRLDistribution] = []
	
	public init(_ ext: Certificate.Extension) throws {
		guard ext.oid == .X509ExtensionID.cRLDistributionPoints else {
			throw CertificateError.incorrectOIDForExtension(
				reason: "Expected \(ASN1ObjectIdentifier.X509ExtensionID.cRLDistributionPoints), got \(ext.oid)"
			)
		}
		let rootNode = try DER.parse(ext.value)
		let crlColl = try CRLDistributions(derEncoded: rootNode)
		crls = crlColl.crls
	}
}
