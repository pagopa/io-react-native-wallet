//
//  MdocReaderAuthentication.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
import CryptoKit
internal import SwiftCBOR

/// Implements mdoc reader authentication
///
/// The data that the mdoc reader authenticates is the ReaderAuthentication structure
/// Currently the mdoc side is implemented (verification of reader-auth CBOR data)
 struct MdocReaderAuthentication {
    
    // Stores the transcript of the session, used for verification
    let transcript: SessionTranscript
    
    /// Validate the reader auth structure contained in the reader's initial message
    /// - Parameters:
    ///   - readerAuthCBOR: An untagged COSE-Sign1 structure containing the signature
    ///   - readerAuthCertificate: The reader auth certificate decoded from above reader-auth structure. Shoudl contain the mdoc reader public key
    ///   - itemsRequestRawData: Reader's item request raw data
    ///   - readerAuthCertificateChain: Reader auth certificate chain decoded from readerAuth structure.
    ///   - rootCerts: Optional array of certificate chains for additional validation
    /// - Returns: A tuple containing a boolean indicating if the validation succeeded, and an optional failure reason
    public func validateReaderAuth(readerAuthCBOR: CBOR, readerAuthCertificate: Data, itemsRequestRawData: [UInt8], readerAuthCertificateChain: [SecCertificate]?, rootCerts: [[SecCertificate]]? = nil) throws -> (Bool, Bool, String?) {
        
        var isValidCertificateChain: Bool = false
        var messages: String? = nil
        var sc: SecCertificate?
        
        if let rootCerts = rootCerts,
            let readerAuthCertificateChain = readerAuthCertificateChain {
            
            // Validate the reader authentication certificate chain using root certificates
            let certValidationResult = SecurityHelpers.isMdocCertificateChainValid(secCertChain: readerAuthCertificateChain, usage: .mdocReaderAuth, rootCertsChains: rootCerts)
           
            print(certValidationResult)
            
            messages = certValidationResult.validationMessages.joined(separator: "\n")
            
           // If the certificate validation succeded, use found leaf certificate as certificate to verify signature
           if certValidationResult.isValid {
               isValidCertificateChain = true
               sc = certValidationResult.leafCert
           }
            
            //TODO: HOW TO HANDLE NOT VALID CERTIFICATE?
            
        }
        
        if sc == nil {
            // Create a certificate object from the readerAuthCertificate data
            sc = SecCertificateCreateWithData(nil, Data(readerAuthCertificate) as CFData)
        }
        
        
        guard let sc else {
            return (false, isValidCertificateChain, "Invalid reader Auth Certificate")
        }
        
        // Create a ReaderAuthentication object using the session transcript and request data
        let ra = ReaderAuthentication(sessionTranscript: transcript, itemsRequestRawData: itemsRequestRawData)
        
        // Encode the ReaderAuthentication object to CBOR format
        let contentBytes = ra.toCBOR(options: CBOROptions()).taggedEncoded.encode(options: CBOROptions())
        
        
        // Create a COSE object to represent the reader's authentication signature
        guard let readerAuth = Cose(type: .sign1, cbor: readerAuthCBOR) else {
            return (false, isValidCertificateChain, "Invalid reader auth CBOR")
        }
        
        // Extract the public key from the certificate
        guard let publicKeyx963 = sc.getPublicKey() else {
            return (false, isValidCertificateChain, "Public key not found in certificate")
        }
        
        // Validate the COSE-Sign1 signature using the public key and the ReaderAuthentication data
        let isSignatureValid = try readerAuth.validateDetachedCoseSign1(payloadData: Data(contentBytes), publicKey_x963: publicKeyx963)
        
        guard let rootCerts = rootCerts else { return (isSignatureValid, isValidCertificateChain, nil) }
        
        // Return the combined result of signature validation and certificate validation messages
        return (isSignatureValid, isValidCertificateChain, messages)
    }
    
    /// Initializes the MdocReaderAuthentication with a given session transcript
    /// - Parameter transcript: The session transcript that provides context for the reader authentication
    public init(transcript: SessionTranscript) {
        self.transcript = transcript
    }
}
