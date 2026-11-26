//
//  Cose.swift
//  libIso18013
//
//  Created by Antonio on 03/10/24.
//

import Foundation
internal import SwiftCBOR
import CryptoKit

extension Cose {
    /// COSE Message Identification
    public enum CoseType : String {
        /// COSE Single Signer Data Object
        /// Only one signature is applied on the message payload
        case sign1 = "Signature1"
        case mac0 = "MAC0"
        /// Idenntifies Cose Message Type from input data
        static func from(data: Data) -> CoseType? {
            guard let cose = try? CBORDecoder(input: data.bytes).decodeItem()?.toCose() else {
                return nil
            }
            
            switch cose.0 {
                case .coseSign1Item:
                    return .sign1
                case .coseMac0Item:
                    return .mac0
                default:
                    return nil
            }
        }
    }
    
    /// ECDSA Algorithm Values defined in
    ///
    /// Table1 in rfc/rfc8152#section-16.2
    public enum VerifyAlgorithm: UInt64 {
        case es256 = 6 //-7 ECDSA w/ SHA-256
        case es384 = 34 //-35 ECDSA w/ SHA-384
        case es512 = 35//-36 ECDSA w/ SHA-512
    }
    
    /// MAC Algorithm Values
    ///
    /// Table 7  in rfc/rfc8152#section-16.2
    public enum MacAlgorithm: UInt64 {
        case hmac256 = 5 //HMAC w/ SHA-256
        case hmac384 = 6 //HMAC w/ SHA-384
        case hmac512 = 7 //HMAC w/ SHA-512
    }
}

extension Cose {
    /// Cose header structure defined in https://datatracker.ietf.org/doc/html/rfc8152
    struct CoseHeader {
        enum Headers : Int {
            
            //https://datatracker.ietf.org/doc/html/rfc8152 -> Table 2: Common Header Parameters
            case alg = 1
            case crit = 2
            case content_type = 3
            case kid = 4
            case iv = 5
            case partial_iv = 6
            case counter_signature = 7
            
            //https://datatracker.ietf.org/doc/html/rfc9360 -> Table 1: X.509 COSE Header Parameters
            case x5bag = 32
            case x5chain = 33
            case x5t = 34
            case x5u = 35
        }
        
        let rawHeader : CBOR?
        let keyId : [UInt8]?
        let algorithm : UInt64?
        
        // MARK: - Initializers
        /// Initialize from CBOR
        /// - Parameter cbor: CBOR representation of the header
        init?(fromBytestring cbor: CBOR){
            guard let cborMap = cbor.decodeBytestring()?.asMap(),
                  let alg = cborMap[Headers.alg]?.asUInt64() else {
                self.init(alg: nil, isNegativeAlg: nil, keyId: nil, rawHeader: cbor)
                return
            }
            self.init(alg: alg, isNegativeAlg: nil, keyId: cborMap[Headers.kid]?.asBytes(), rawHeader: cbor)
        }
        
        public init?(alg: UInt64?, isNegativeAlg: Bool?, keyId: [UInt8]?, rawHeader : CBOR? = nil){
            guard alg != nil || rawHeader != nil else { return nil }
            self.algorithm = alg
            self.keyId = keyId
            func algCbor() -> CBOR { isNegativeAlg! ? .negativeInt(alg!) : .unsignedInt(alg!) }
            self.rawHeader = rawHeader ?? .byteString(CBOR.map([.unsignedInt(UInt64(Headers.alg.rawValue)) : algCbor()]).encode())
        }
    }
}

/// Struct which describes  a representation for cryptographic keys;  how to create and process signatures, message authentication codes, and  encryption using Concise Binary Object Representation (CBOR) or serialization.
struct Cose {
    public let type: CoseType
    let protectedHeader : CoseHeader
    let unprotectedHeader : CoseHeader?
    public let payload : CBOR
    public let signature : Data
    
    public var verifyAlgorithm: VerifyAlgorithm? { guard type == .sign1, let alg = protectedHeader.algorithm else { return nil }; return VerifyAlgorithm(rawValue: alg) }
    public var macAlgorithm: MacAlgorithm? { guard type == .mac0, let alg = protectedHeader.algorithm else { return nil }; return MacAlgorithm(rawValue: alg) }
    
    var keyId : Data? {
        var keyData : Data?
        if let unprotectedKeyId = unprotectedHeader?.keyId {
            keyData = Data(unprotectedKeyId)
        }
        if let protectedKeyId = protectedHeader.keyId {
            keyData = Data(protectedKeyId)
        }
        return keyData
    }
    
    /// Structure according to https://tools.ietf.org/html/rfc8152#section-4.2
    public var signatureStruct : Data? {
        get {
            guard let header = protectedHeader.rawHeader else {
                return nil
            }
            switch type {
                case .sign1, .mac0:
                    let context = CBOR(stringLiteral: self.type.rawValue)
                    let externalAad = CBOR.byteString([UInt8]()) /*no external application specific data*/
                    let cborArray = CBOR(arrayLiteral: context, header, externalAad, payload)
                    return Data(cborArray.encode())
            }
        }
    }
}

extension Cose {
    ///initializer to create a cose message from a cbor representation
    /// - Parameters:
    ///  - type: Cose message type
    ///  - cbor: CBOR representation of the cose message
    public init?(type: CoseType, cbor: SwiftCBOR.CBOR) {
        guard let coseList = cbor.asList(), let protectedHeader = CoseHeader(fromBytestring: coseList[0]),
              let signature = coseList[3].asBytes() else { return nil }
        
        self.protectedHeader = protectedHeader
        self.unprotectedHeader = CoseHeader(fromBytestring: coseList[1]) ?? nil
        self.payload = coseList[2]
        self.signature = Data(signature)
        self.type = type
    }
    ///initializer to create a detached cose signature
    public init(type: CoseType, algorithm: UInt64, signature: Data) {
        self.protectedHeader = CoseHeader(alg: algorithm, isNegativeAlg: type == .sign1, keyId: nil)!
        self.unprotectedHeader = nil
        self.payload = .null
        self.signature = signature
        self.type = type
    }
    ///initializer to create a payload cose message
    public init(type: CoseType, algorithm: UInt64, payloadData: Data, unprotectedHeaderCbor: CBOR? = nil, signature: Data? = nil) {
        self.protectedHeader = CoseHeader(alg: algorithm, isNegativeAlg: type == .sign1, keyId: nil)!
        self.unprotectedHeader = unprotectedHeaderCbor != nil ? CoseHeader(alg: nil, isNegativeAlg: nil, keyId: nil, rawHeader: unprotectedHeaderCbor!) : nil
        self.payload = .byteString(payloadData.bytes)
        self.signature = signature ?? Data()
        self.type = type
    }
    ///initializer to create a cose message from a detached cose and a payload
    /// - Parameters:
    /// - other: detached cose message
    /// - payloadData: payload data
    public init(other: Cose, payloadData: Data) {
        self.protectedHeader = other.protectedHeader
        self.unprotectedHeader = other.unprotectedHeader
        self.payload = .byteString(payloadData.bytes)
        self.signature = other.signature
        self.type = other.type
    }
}

extension Cose: CBOREncodable {
    public func toCBOR(options: CBOROptions) -> CBOR {
        .array([protectedHeader.rawHeader ?? .map([:]), unprotectedHeader?.rawHeader ?? .map([:]), payload, .byteString(signature.bytes)])
    }
}

extension Cose {
    
    /// Create a COSE-Sign1 structure according to https://datatracker.ietf.org/doc/html/rfc8152#section-4.4
    /// - Parameters:
    ///   - payloadData: Payload to be signed
    ///   - deviceKey: static device private key (encoded with ANSI x.963 or stored in SE)
    ///   - alg: The algorithm to sign with
    /// - Returns: a detached COSE-Sign1 structure with payload data included
    static func makeCoseSign1(payloadData: Data, deviceKey: CoseKeyPrivate, alg: Cose.VerifyAlgorithm) throws -> Cose {
        let coseSign = try makeDetachedCoseSign1(payloadData: payloadData, deviceKey: deviceKey, alg: alg)
        
        return Cose(other: coseSign, payloadData: payloadData)
    }
    
    /// Create a detached COSE-Sign1 structure according to https://datatracker.ietf.org/doc/html/rfc8152#section-4.4
    /// - Parameters:
    ///   - payloadData: Payload to be signed
    ///   - deviceKey: static device private key (encoded with ANSI x.963 or stored in SE)
    ///   - alg: The algorithm to sign with
    /// - Returns: a detached COSE-Sign1 structure
    static func makeDetachedCoseSign1(payloadData: Data, deviceKey: CoseKeyPrivate, alg: Cose.VerifyAlgorithm) throws-> Cose {
        let coseIn = Cose(type: .sign1, algorithm: alg.rawValue, payloadData: payloadData)
        let dataToSign = coseIn.signatureStruct!
        let signature: Data
        if let secKey = deviceKey.secKey {
            signature = try computeSignatureValueSecurity(dataToSign, deviceKey: secKey, alg: alg)
        }
        else if let keyID = deviceKey.secureEnclaveKeyID {
            let signingKey = try SecureEnclave.P256.Signing.PrivateKey(dataRepresentation: keyID)
            signature = (try! signingKey.signature(for: dataToSign)).rawRepresentation
        } else {
            signature = try computeSignatureValue(dataToSign, deviceKey_x963: deviceKey.getx963Representation(), alg: alg)
        }
        // return COSE_SIGN1 struct
        return Cose(type: .sign1, algorithm: alg.rawValue, signature: signature)
    }
    
    /// Generates an Elliptic Curve Digital Signature Algorithm (ECDSA) signature of the provide data over an elliptic curve. Apple Crypto implementation is used
    /// - Parameters:
    ///   - dataToSign: Data to create the signature for (payload)
    ///   - deviceKey_x963: x963 representation of the private key
    ///   - alg: ``MdocDataModel18013/Cose.VerifyAlgorithm``
    /// - Returns: The signature corresponding to the data
    public static func computeSignatureValue(_ dataToSign: Data, deviceKey_x963: Data, alg: Cose.VerifyAlgorithm) throws -> Data {
        let sign1Value: Data
        switch alg {
            case .es256:
                let signingKey = try P256.Signing.PrivateKey(x963Representation: deviceKey_x963)
                sign1Value = (try! signingKey.signature(for: dataToSign)).rawRepresentation
            case .es384:
                let signingKey = try P384.Signing.PrivateKey(x963Representation: deviceKey_x963)
                sign1Value = (try! signingKey.signature(for: dataToSign)).rawRepresentation
            case .es512:
                let signingKey = try P521.Signing.PrivateKey(x963Representation: deviceKey_x963)
                sign1Value = (try! signingKey.signature(for: dataToSign)).rawRepresentation
        }
        return sign1Value
    }
    
    /// Generates an Elliptic Curve Digital Signature Algorithm (ECDSA) signature of the provide data over an elliptic curve. Apple Security implementation is used
    /// - Parameters:
    ///   - dataToSign: Data to create the signature for (payload)
    ///   - deviceKey: SecKey privateKey
    ///   - alg: ``MdocDataModel18013/Cose.VerifyAlgorithm``
    /// - Returns: The signature corresponding to the data
    public static func computeSignatureValueSecurity(_ dataToSign: Data, deviceKey: SecKey, alg: Cose.VerifyAlgorithm) throws -> Data {
        
        let signAlg: SecKeyAlgorithm
        
        switch(alg) {
            case .es256:
                signAlg = .ecdsaSignatureMessageX962SHA256
            case .es384:
                signAlg = .ecdsaSignatureMessageX962SHA384
            case .es512:
                signAlg = .ecdsaSignatureMessageX962SHA512
        }
        
        
        var error: Unmanaged<CFError>?
        guard let signature = SecKeyCreateSignature(
            deviceKey,
            signAlg,
            dataToSign as CFData,
            &error
        ) as Data? else {
            throw error!.takeRetainedValue() as Error
        }
        
        switch(alg) {
            case .es256:
                return try P256.Signing.ECDSASignature(derRepresentation: signature).rawRepresentation
            case .es384:
                return try P384.Signing.ECDSASignature(derRepresentation: signature).rawRepresentation
            case .es512:
                return try P521.Signing.ECDSASignature(derRepresentation: signature).rawRepresentation
        }
    }
    
    
    /// Validate (verify) a detached COSE-Sign1 structure according to https://datatracker.ietf.org/doc/html/rfc8152#section-4.4
    /// - Parameters:
    ///   - payloadData: Payload data signed
    ///   - publicKey_x963: public key corresponding the private key used to sign the data
    /// - Returns: True if validation of signature succeeds
    public func validateDetachedCoseSign1(payloadData: Data, publicKey_x963: Data) throws -> Bool {
        let b: Bool
        guard type == .sign1 else {
            //Cose must have type sign1
            return false
        }
        guard let verifyAlgorithm = verifyAlgorithm else {
            //Cose signature algorithm not found
            return false
        }
        let coseWithPayload = Cose(other: self, payloadData: payloadData)
        guard let signatureStruct = coseWithPayload.signatureStruct else {
            //Cose signature struct cannot be computed
            return false
        }
        switch verifyAlgorithm {
            case .es256:
                let signingPubKey = try P256.Signing.PublicKey(x963Representation: publicKey_x963)
                let ecdsa_signature = try P256.Signing.ECDSASignature(rawRepresentation: signature)
                b = signingPubKey.isValidSignature(ecdsa_signature, for: signatureStruct)
            case .es384:
                let signingPubKey = try P384.Signing.PublicKey(x963Representation: publicKey_x963)
                let ecdsa_signature = try P384.Signing.ECDSASignature(rawRepresentation: signature)
                b = signingPubKey.isValidSignature(ecdsa_signature, for: signatureStruct)
            case .es512:
                let signingPubKey = try P521.Signing.PublicKey(x963Representation: publicKey_x963)
                let ecdsa_signature = try P521.Signing.ECDSASignature(rawRepresentation: signature)
                b = signingPubKey.isValidSignature(ecdsa_signature, for: signatureStruct)
        }
        return b
    }
    
    public func validateCoseSign1(publicKey_x963: Data) throws -> Bool {
        let b: Bool
        guard type == .sign1 else {
            //Cose must have type sign1
            return false
        }
        guard let verifyAlgorithm = verifyAlgorithm else {
            //Cose signature algorithm not found
            return false
        }
        
        guard let signatureStruct = self.signatureStruct else {
            //Cose signature struct cannot be computed
            return false
        }
        switch verifyAlgorithm {
            case .es256:
                let signingPubKey = try P256.Signing.PublicKey(x963Representation: publicKey_x963)
                let ecdsa_signature = try P256.Signing.ECDSASignature(rawRepresentation: signature)
                b = signingPubKey.isValidSignature(ecdsa_signature, for: signatureStruct)
            case .es384:
                let signingPubKey = try P384.Signing.PublicKey(x963Representation: publicKey_x963)
                let ecdsa_signature = try P384.Signing.ECDSASignature(rawRepresentation: signature)
                b = signingPubKey.isValidSignature(ecdsa_signature, for: signatureStruct)
            case .es512:
                let signingPubKey = try P521.Signing.PublicKey(x963Representation: publicKey_x963)
                let ecdsa_signature = try P521.Signing.ECDSASignature(rawRepresentation: signature)
                b = signingPubKey.isValidSignature(ecdsa_signature, for: signatureStruct)
        }
        return b
    }
}

extension Cose {
    
    /// Make an untagged COSE-Mac0 structure according to https://datatracker.ietf.org/doc/html/rfc8152#section-6.3 (How to Compute and Verify a MAC)
    /// - Parameters:
    ///   - payloadData: The serialized content to be MACed
    ///   - key: ECDH-agreed key
    ///   - alg: MAC algorithm
    /// - Returns: A Cose structure with detached payload used for verification
    public static func makeDetachedCoseMac0(payloadData: Data, key: SymmetricKey, alg: Cose.MacAlgorithm) -> Cose {
        let coseIn = Cose(type: .mac0, algorithm: alg.rawValue, payloadData: payloadData)
        let dataToSign = coseIn.signatureStruct!
        // return COSE_MAC0 struct
        return Cose(type: .mac0, algorithm: alg.rawValue, signature: computeMACValue(dataToSign, key: key, alg: alg))
    }
    /// Computes a message authenticated code for the data
    /// - Parameters:
    ///   - dataToAuthenticate: Data for which to compute the code
    ///   - key: symmetric key
    ///   - alg: HMAC algorithm variant
    /// - Returns: The message authenticated code
    public static func computeMACValue(_ dataToAuthenticate: Data, key: SymmetricKey, alg: Cose.MacAlgorithm) -> Data {
        let mac0Value: Data
        switch alg {
            case .hmac256:
                let hashCode = CryptoKit.HMAC<SHA256>.authenticationCode(for: dataToAuthenticate, using: key)
                mac0Value = hashCode.withUnsafeBytes{ (p: UnsafeRawBufferPointer) -> Data in  Data(p[0..<p.count]) }
            case .hmac384:
                let hashCode = CryptoKit.HMAC<SHA384>.authenticationCode(for: dataToAuthenticate, using: key)
                mac0Value = hashCode.withUnsafeBytes{ (p: UnsafeRawBufferPointer) -> Data in  Data(p[0..<p.count]) }
            case .hmac512:
                let hashCode = CryptoKit.HMAC<SHA512>.authenticationCode(for: dataToAuthenticate, using: key)
                mac0Value = hashCode.withUnsafeBytes{ (p: UnsafeRawBufferPointer) -> Data in  Data(p[0..<p.count]) }
        }
        return mac0Value
    }
}
