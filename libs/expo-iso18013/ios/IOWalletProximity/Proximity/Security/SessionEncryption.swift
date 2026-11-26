//
//  SessionEncryption.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
import CryptoKit

internal import SwiftCBOR

/// Session encryption uses standard ephemeral key ECDH to establish session keys for authenticated symmetric encryption.
/// The ``SessionEncryption`` struct implements session encryption (for the mDoc currently).
/// It is initialized from:
/// a) the session establishment data received from the mdoc reader
/// b) the device engagement data generated from the mdoc, and c) the handover data
struct SessionEncryption {
    // Role of the current session (either reader or mdoc)
    public let sessionRole: SessionRole
    
    // Counter for tracking message sequence in the session
    var sessionCounter: UInt32 = 1
    
    // Optional error code indicating the state of the session
    var errorCode: UInt?
    
    // Static identifiers used to distinguish between encryption/decryption based on session role
    static let IDENTIFIER0: [UInt8] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    static let IDENTIFIER1: [UInt8] = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01]
    
    // Encryption identifier depends on the session role
    var encryptionIdentifier: [UInt8] { sessionRole == .reader ? Self.IDENTIFIER0 : Self.IDENTIFIER1 }
    
    // Decryption identifier depends on the session role
    var decryptionIdentifier: [UInt8] { sessionRole == .reader ? Self.IDENTIFIER1 : Self.IDENTIFIER0 }
    
    // Stores the session keys generated using ECDH
    public let sessionKeys: CoseKeyExchange
    
    // Raw data for device engagement
    var deviceEngagementRawData: [UInt8]
    
    // Raw data for the reader's key
    let eReaderKeyRawData: [UInt8]
    
    // Handover information represented in CBOR format
    let handOver: CBOR
    
    /// Initializes session encryption for mDoc
    /// - Parameters:
    ///   - se: Session establishment data from the mdoc reader
    ///   - de: Device engagement created by the mdoc
    ///   - handOver: Handover object according to the transfer protocol
    public init?(se: SessionEstablishment, de: DeviceEngagement, handOver: CBOR) {
        sessionRole = .mdoc
        deviceEngagementRawData = de.qrCoded ?? de.encode(options: CBOROptions())
        
        // Validate that the device engagement contains a private key
        guard let pk = de.privateKey else {
            //Device engagement for mdoc must have the private key
            return nil
        }
        
        // Validate that reader key raw data is available
        guard let rkrd = se.eReaderKeyRawData else {
            //Reader key data not available
            return nil
        }
        self.eReaderKeyRawData = rkrd
        
        // Validate that the eReader key can be decoded
        guard let ok = se.eReaderKey else {
            //Could not decode ereader key
            return nil
        }
        
        // Generate session keys using ECDH
        sessionKeys = CoseKeyExchange(publicKey: ok, privateKey: pk)
        self.handOver = handOver
    }
    
    /// Generates a nonce to initialize encryption or decryption
    /// - Parameters:
    ///   - counter: Message counter value (4-byte big-endian unsigned integer)
    ///   - isEncrypt: Indicates if the nonce is for encryption
    /// - Returns: The nonce used for encryption or decryption
    func makeNonce(_ counter: UInt32, isEncrypt: Bool) throws -> AES.GCM.Nonce {
        var dataNonce = Data()
        let identifier = isEncrypt ? encryptionIdentifier : decryptionIdentifier
        dataNonce.append(Data(identifier))
        dataNonce.append(Data(counter.byteArrayLittleEndian))
        let nonce = try AES.GCM.Nonce(data: dataNonce)
        return nonce
    }
    
    /// Derives a symmetric key using HKDF
    /// - Parameters:
    ///   - sharedSecret: The shared secret obtained from key exchange
    ///   - salt: Salt value for HKDF
    ///   - info: Context-specific information for key derivation
    /// - Returns: The derived symmetric key
    static func HMACKeyDerivationFunction(sharedSecret: SharedSecret, salt: [UInt8], info: Data) throws -> SymmetricKey {
        let symmetricKey = sharedSecret.hkdfDerivedSymmetricKey(using: SHA256.self, salt: salt, sharedInfo: info, outputByteCount: 32)
        return symmetricKey
    }
    
    /// Derives a symmetric key using HKDF
    /// - Parameters:
    ///   - sharedSecret: The shared secret obtained from key exchange
    ///   - salt: Salt value for HKDF
    ///   - info: Context-specific information for key derivation
    /// - Returns: The derived symmetric key
    static func HMACKeyDerivationFunction(sharedSecret: SymmetricKey, salt: [UInt8], info: Data) -> SymmetricKey {
        if #available(iOS 14.0, *) {
            return HKDF<SHA256>.deriveKey(inputKeyMaterial: sharedSecret, salt: salt, info: info, outputByteCount: 32)
        } else {
            return iOS13HKDF.deriveKey(inputKeyMaterial: sharedSecret, salt: salt, info: info, outputByteCount: 32)
        }
    }
    
    /// Encrypts data using the current session key
    /// - Parameter data: Data to be encrypted
    /// - Returns: The encrypted data or nil if encryption fails
    mutating public func encrypt(_ data: [UInt8]) throws -> [UInt8]? {
        // Generate a nonce for encryption
        let nonce = try makeNonce(sessionCounter, isEncrypt: true)
        
        // Derive the symmetric key for encryption
        guard let symmetricKeyForEncrypt = try makeKeyAgreementAndDeriveSessionKey(isEncrypt: true) else { return nil }
        
        // Encrypt the data using AES-GCM
        guard let encryptedContent = try AES.GCM.seal(data, using: symmetricKeyForEncrypt, nonce: nonce).combined else { return nil }
        
        // Increment the session counter if the role is mdoc
        if sessionRole == .mdoc { sessionCounter += 1 }
        
        // Return the encrypted data excluding the nonce prefix
        return [UInt8](encryptedContent.dropFirst(12))
    }
    
    /// Decrypts the encrypted data using the session key
    /// - Parameter ciphertext: The encrypted data to be decrypted
    /// - Returns: The decrypted data or nil if decryption fails
    mutating public func decrypt(_ ciphertext: [UInt8]) throws -> [UInt8]? {
        // Generate a nonce for decryption
        let nonce = try makeNonce(sessionCounter, isEncrypt: false)
        
        // Construct the sealed box from the nonce and ciphertext
        let sealedBox = try AES.GCM.SealedBox(combined: nonce + ciphertext)
        
        // Derive the symmetric key for decryption
        guard let symmetricKeyForDecrypt = try makeKeyAgreementAndDeriveSessionKey(isEncrypt: false) else { return nil }
        
        // Decrypt the content using AES-GCM
        let decryptedContent = try AES.GCM.open(sealedBox, using: symmetricKeyForDecrypt)
        return [UInt8](decryptedContent)
    }
    
    /// Generates the session transcript
    public var transcript: SessionTranscript {
        SessionTranscript(devEngRawData: deviceEngagementRawData, eReaderRawData: eReaderKeyRawData, handOver: handOver)
    }
    
    /// Encodes the session transcript to a byte array
    public var sessionTranscriptBytes: [UInt8] {
        let trCbor = transcript.taggedEncoded
        return trCbor.encode(options: CBOROptions())
    }
    
    /// Gets the appropriate info string based on encryption or decryption
    /// - Parameter isEncrypt: Indicates if the operation is encryption
    /// - Returns: The info string used for key derivation
    func getInfo(isEncrypt: Bool) -> String {
        isEncrypt ? (sessionRole == .mdoc ? "SKDevice" : "SKReader") : (sessionRole == .mdoc ? "SKReader" : "SKDevice")
    }
    
    /// Derives the session key using ECKA-DH
    /// - Parameter isEncrypt: Indicates if the key is for encryption
    /// - Returns: The derived symmetric key or nil if key agreement fails
    func makeKeyAgreementAndDeriveSessionKey(isEncrypt: Bool) throws -> SymmetricKey? {
        
        if sessionKeys.privateKey.secKey != nil {
            guard let sharedKey = sessionKeys.makeEckaDHAgreementSecurity() else {
                return nil
            }
            
            let symmetricKey = Self.HMACKeyDerivationFunction(sharedSecret: sharedKey, salt: sessionTranscriptBytes, info: getInfo(isEncrypt: isEncrypt).data(using: .utf8)!)
            
            return symmetricKey
        }
        
        // Perform ECKA-DH key agreement
        guard let sharedKey = sessionKeys.makeEckaDHAgreement(inSecureEnclave: sessionKeys.privateKey.secureEnclaveKeyID != nil) else {
            //Error in ECKA session key agreement
            return nil
        }
        
        // Derive the symmetric key using HKDF
        let symmetricKey = try Self.HMACKeyDerivationFunction(sharedSecret: sharedKey, salt: sessionTranscriptBytes, info: getInfo(isEncrypt: isEncrypt).data(using: .utf8)!)
        return symmetricKey
    }
    
}


