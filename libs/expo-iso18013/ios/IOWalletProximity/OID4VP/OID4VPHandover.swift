//
//  OID4VPHandover.swift
//  IOWalletProximity
//
//  Created by Antonio Caparello on 20/03/25.
//

internal import SwiftCBOR
internal import Crypto

/**
 * OpenID4VPHandover defined in OpenID4VP 1.0 Appendix B.2.6.1, used when the request
 * is not received through the Digital Credentials API:
 * ```
 * OpenID4VPHandover = ["OpenID4VPHandover", sha-256(cbor(OpenID4VPHandoverInfo))]
 * OpenID4VPHandoverInfo = [clientId, nonce, jwkThumbprint / null, responseUri]
 * ```
 */
struct OID4VPHandover : CBOREncodable {
    let clientId: String
    let responseUri: String
    let authorizationRequestNonce: String
    let jwkThumbprint: [UInt8]?
    
    func toCBOR(options: SwiftCBOR.CBOROptions) -> SwiftCBOR.CBOR {
        let encodedHandoverInfo = CBOR(arrayLiteral:
            .utf8String(clientId),
            .utf8String(authorizationRequestNonce),
            jwkThumbprint.map { .byteString($0) } ?? .null,
            .utf8String(responseUri)
        ).encode()
        
        return CBOR(arrayLiteral:
            .utf8String("OpenID4VPHandover"),
            .byteString(calcSHA256Hash(encodedHandoverInfo))
        )
    }
    
    func calcSHA256Hash( _ data: [UInt8] ) -> [UInt8] {
        var sha256 = SHA256()
        sha256.update(data: data)
        let hash = sha256.finalize()
        
        return Array(hash)
    }
    
}
