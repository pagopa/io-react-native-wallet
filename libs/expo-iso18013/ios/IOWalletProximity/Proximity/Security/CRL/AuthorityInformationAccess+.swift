//
//  AuthorityInformationAccess+.swift
//  libIso18013
//
//  Created by Antonio Caparello on 17/10/24.
//

internal import X509

extension AuthorityInformationAccess {
	var infoAccesses: [AccessDescription]? {
		let mirror = Mirror(reflecting: self)
		for case let (label?, value) in mirror.children {
			if label == "descriptions" {
				return value as? [AccessDescription]
			}
		}
		return nil
	}
}
