//
//  ASN1ObjectIdentifier+.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

internal import SwiftASN1

extension ASN1ObjectIdentifier {
    static let extKeyUsageMdlReaderAuth: ASN1ObjectIdentifier = [1,0,18013,5,1,6]
    enum X509ExtensionID {
        static let cRLDistributionPoints: ASN1ObjectIdentifier = [2,5,29,31]
        
        static let issuerAlternativeName: ASN1ObjectIdentifier = [2,5,29,18]
    }
}
