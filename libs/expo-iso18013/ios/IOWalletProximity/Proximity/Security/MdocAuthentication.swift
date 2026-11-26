//
//  MdocAuthentication.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
import CryptoKit
internal import SwiftCBOR

/// The security objective of mdoc authentication is to prevent cloning of the mdoc and to mitigate man in the middle attacks.
/// Currently the mdoc side is implemented (generation of device-auth)
/// Initialized from the session transcript object, the device private key and the reader ephemeral public key 

struct MdocAuthentication {
	
    let transcript: SessionTranscript
    let authKeys: CoseKeyExchange
    var sessionTranscriptBytes: [UInt8] { transcript.toCBOR(options: CBOROptions()).taggedEncoded.encode(options: CBOROptions()) }
	
	public init(transcript: SessionTranscript, authKeys: CoseKeyExchange) {
		self.transcript = transcript
		self.authKeys = authKeys
	}

	/// Calculate the ephemeral MAC key, by performing ECKA-DH (Elliptic Curve Key Agreement Algorithm – Diffie-Hellman)
	/// The inputs shall be the SDeviceKey.Priv and EReaderKey.Pub for the mdoc and EReaderKey.Priv and SDeviceKey.Pub for the mdoc reader.
    func makeMACKeyAggrementAndDeriveKey(deviceAuth: DeviceAuthentication) throws -> SymmetricKey? {
        
        if authKeys.privateKey.secKey != nil {
            guard let sharedKey = authKeys.makeEckaDHAgreementSecurity() else {
                return nil
            }
            
            let symmetricKey = SessionEncryption.HMACKeyDerivationFunction(sharedSecret: sharedKey, salt: sessionTranscriptBytes, info: "EMacKey".data(using: .utf8)!)
            
            return symmetricKey
        }
        
        
        guard let sharedKey = authKeys.makeEckaDHAgreement(inSecureEnclave: authKeys.privateKey.secureEnclaveKeyID != nil) else {
            return nil
        }
		let symmetricKey = try SessionEncryption.HMACKeyDerivationFunction(sharedSecret: sharedKey, salt: sessionTranscriptBytes, info: "EMacKey".data(using: .utf8)!)
		return symmetricKey
	}
	
	/// Generate a ``DeviceAuth`` structure used for mdoc-authentication
	/// - Parameters:
	///   - docType: docType of the document to authenticate
	///   - deviceNameSpacesRawData: device-name spaces raw data. Usually is a CBOR-encoded empty dictionary
	///   - bUseDeviceSign: Specify true for device authentication (false is default)
	/// - Returns: DeviceAuth instance
    public func getDeviceAuthForTransfer(docType: String, deviceNameSpacesRawData: [UInt8] = [0xA0], dauthMethod: DeviceAuthMethod) throws -> DeviceAuth? {
        if dauthMethod == .deviceSignature {
            return try MdocAuthentication.getDeviceAuthForTransferSignature(transcript: transcript, docType: docType, deviceNameSpacesRawData: deviceNameSpacesRawData, privateKey: authKeys.privateKey)
        } else {
            let da = DeviceAuthentication(sessionTranscript: transcript, docType: docType, deviceNameSpacesRawData: deviceNameSpacesRawData)
            let contentBytes = da.toCBOR(options: CBOROptions()).taggedEncoded.encode(options: CBOROptions())
           
            guard let symmetricKey = try self.makeMACKeyAggrementAndDeriveKey(deviceAuth: da) else { return nil}
            let coseRes: Cose = Cose.makeDetachedCoseMac0(payloadData: Data(contentBytes), key: symmetricKey, alg: .hmac256)
            return DeviceAuth(coseMacOrSignature: coseRes)
        }
    }
    
    public static func getDeviceAuthForTransferSignature(transcript: SessionTranscript, docType: String, deviceNameSpacesRawData: [UInt8] = [0xA0], privateKey: CoseKeyPrivate) throws -> DeviceAuth? {
        let da = DeviceAuthentication(sessionTranscript: transcript, docType: docType, deviceNameSpacesRawData: deviceNameSpacesRawData)
        let contentBytes = da.toCBOR(options: CBOROptions()).taggedEncoded.encode(options: CBOROptions())
        let coseRes: Cose = try Cose.makeDetachedCoseSign1(payloadData: Data(contentBytes), deviceKey: privateKey, alg: .es256)
        return DeviceAuth(coseMacOrSignature: coseRes)
    }
}
