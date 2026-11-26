//
//  CoseKeyExchange.swift
//  libIso18013
//
//  Created by Martina D'urso on 15/10/24.
//

import Foundation
import CryptoKit

/// A COSE_Key exchange pair
struct CoseKeyExchange {
	public let publicKey: CoseKey
	public let privateKey: CoseKeyPrivate

	public init(publicKey: CoseKey, privateKey: CoseKeyPrivate) {
		self.publicKey = publicKey
		self.privateKey = privateKey
	}
}

extension CoseKeyExchange {
    
    /// Computes a shared secret from the private key and the provided public key from another party.
    public func makeEckaDHAgreementSecurity() -> SymmetricKey? {
        
        guard let privateKey = privateKey.secKey else {
            return nil
        }
        
        guard let publicKey = publicKey.secKey else {
            return nil
        }
        
    
        var error: Unmanaged<CFError>?
        guard let derivedData = SecKeyCopyKeyExchangeResult(
            privateKey,
            SecKeyAlgorithm.ecdhKeyExchangeStandard,
            publicKey,
            [:] as CFDictionary,
            &error
        ) as Data? else {
            return nil
        }
        
        return SymmetricKey(data: derivedData)
        
    }

    
    /// Computes a shared secret from the private key and the provided public key from another party.
    public func makeEckaDHAgreement(inSecureEnclave: Bool) -> SharedSecret? {
        var sharedSecret: SharedSecret?
        switch publicKey.crv {
            case .p256:
                guard let puk256 = try? P256.KeyAgreement.PublicKey(x963Representation: publicKey.getx963Representation()) else { return nil}
                if inSecureEnclave {
                    guard let sOID = privateKey.secureEnclaveKeyID else { return nil }
                    guard let prk256 = try? SecureEnclave.P256.KeyAgreement.PrivateKey(dataRepresentation: sOID) else { return nil}
                    sharedSecret = try? prk256.sharedSecretFromKeyAgreement(with: puk256)
                } else {
                    guard let prk256 = try? P256.KeyAgreement.PrivateKey(x963Representation: privateKey.getx963Representation()) else { return nil}
                    sharedSecret = try? prk256.sharedSecretFromKeyAgreement(with: puk256)
                }
            case .p384:
                guard let puk384 = try? P384.KeyAgreement.PublicKey(x963Representation: publicKey.getx963Representation()) else { return nil}
                guard let prk384 = try? P384.KeyAgreement.PrivateKey(x963Representation: privateKey.getx963Representation()) else { return nil}
                sharedSecret = try? prk384.sharedSecretFromKeyAgreement(with: puk384)
            case .p521:
                guard let puk521 = try? P521.KeyAgreement.PublicKey(x963Representation: publicKey.getx963Representation()) else { return nil}
                guard let prk521 = try? P521.KeyAgreement.PrivateKey(x963Representation: privateKey.getx963Representation()) else { return nil}
                sharedSecret = try? prk521.sharedSecretFromKeyAgreement(with: puk521)
        }
        return sharedSecret
    }
}
