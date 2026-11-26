//
//  X509+.swift
//  libIso18013
//
//  Created by Antonio Caparello on 17/10/24.
//

internal import X509

extension X509.Certificate.SignatureAlgorithm {
	var isECDSA256or384or512: Bool {
		switch self {
		case .ecdsaWithSHA256, .ecdsaWithSHA384, .ecdsaWithSHA512: true
		default: false
		}
	}
}

extension X509.Certificate {
	
	func getSubjectAlternativeNames() -> [GeneralName]? {
		guard let sa = try? extensions.subjectAlternativeNames, sa.count > 0 else { return nil }
		return Array(sa)
	}
	
	func hasDuplicateExtensions() -> Bool {
		let extensionsOids = extensions.map(\.oid)
		return Set(extensionsOids).count < extensionsOids.count
	}
}
