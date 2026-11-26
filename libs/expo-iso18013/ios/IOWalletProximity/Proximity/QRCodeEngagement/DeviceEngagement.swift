//
//  DeviceEngagement.swift
//  libIso18013
//
//  Created by Martina D'urso on 15/10/24.
//

import Foundation
internal import SwiftCBOR
import CryptoKit

// Struct to represent device engagement
struct DeviceEngagement {
    // Implementation version
    static let versionImpl: String = "1.0"
    // Device version, initialized with the implementation version
    var version: String = Self.versionImpl
    // Device security information
    let security: Security
    // Optional device retrieval methods
    public var deviceRetrievalMethods: [DeviceRetrievalMethod]? = nil
    // List of strings reserved for future use (rfus)
    var rfus: [String]?
    // Device private key (only for the holder)
    var d: [UInt8]?
    // Secure Enclave key identifier
    var seKeyID: Data?
    
    // Secure Enclave key identifier
    var secKey: SecKey?
    
    // QR code encoding for the device
    public var qrCoded: [UInt8]?
    
    // Generates the device engagement
    /// - Parameters:
    ///   - isBleServer: true for BLE mdoc peripheral server mode, false for BLE mdoc central client mode
    ///   - crv: The type of EC curve used in the ephemeral mdoc private key
    ///   - rfus: List of strings reserved for future use
    public init(isBleServer: Bool?, crv: ECCurveName = .p256, rfus: [String]? = nil) {
        let pk: CoseKeyPrivate
        // If the Secure Enclave is available and the curve is p256, create a private key in the Secure Enclave
        if SecureEnclave.isAvailable, crv == .p256, let se = try? SecureEnclave.P256.KeyAgreement.PrivateKey() {
            pk = CoseKeyPrivate(publicKeyx963Data: se.publicKey.x963Representation, secureEnclaveKeyID: se.dataRepresentation)
            seKeyID = se.dataRepresentation
        } else {
            // Otherwise, create a regular private key
            pk = CoseKeyPrivate(crv: crv)
            d = pk.d
        }
        security = Security(deviceKey: pk.key)
        self.rfus = rfus
        // Add the BLE retrieval method if specified
        if let isBleServer {
            deviceRetrievalMethods = [.ble(isBleServer: isBleServer, uuid: DeviceRetrievalMethod.getRandomBleUuid())]
        }
    }
    
    init?(pk: CoseKeyPrivate, rfus: [String]? = nil) {
        
        if let secKey = pk.secKey {
            self.secKey = secKey
        }
        else if let secureKeyId = pk.secureEnclaveKeyID {
            self.seKeyID = secureKeyId
        }
        else if !pk.d.isEmpty {
            self.d = pk.d
        }
        else {
            return nil
        }
        
        self.rfus = rfus
        
        self.security = Security(deviceKey: pk.key)
        
    }
    
    // Initializes the device engagement from CBOR data
    public init?(data: [UInt8]) throws {
        guard let obj = try? CBOR.decode(data) else { return nil }
        try self.init(cbor: obj)
    }
    
    // Returns the device private key, if available
    var privateKey: CoseKeyPrivate? {
        if let secKey = secKey {
            return CoseKeyPrivate(publicKey: security.deviceKey, secKey: secKey)
        }
        else if let seKeyID {
            return CoseKeyPrivate(publicKeyx963Data: security.deviceKey.getx963Representation(), secureEnclaveKeyID: seKeyID)
        } else if let d {
            return CoseKeyPrivate(key: security.deviceKey, d: d)
        }
        return nil
    }
    
    // Checks if the device is in BLE server mode
    public var isBleServer: Bool? {
        guard let deviceRetrievalMethods else { return nil }
        for case let .ble(isBleServer, _) in deviceRetrievalMethods {
            return isBleServer
        }
        return nil
    }
    
    // Returns the BLE UUID, if available
    public var ble_uuid: String? {
        guard let deviceRetrievalMethods else { return nil }
        for case let .ble(_, uuid) in deviceRetrievalMethods {
            return uuid
        }
        return nil
    }
    
    // Returns the nfc maxLenCommand, if available
    public var nfc_maxLenCommand: UInt64? {
        guard let deviceRetrievalMethods else { return nil }
        for case let .nfc(maxLen, _) in deviceRetrievalMethods {
            return maxLen
        }
        return nil
    }
    
    // Returns the nfc maxLenResponse, if available
    public var nfc_maxLenResponse: UInt64? {
        guard let deviceRetrievalMethods else { return nil }
        for case let .nfc(_, maxLen) in deviceRetrievalMethods {
            return maxLen
        }
        return nil
    }
}


// Extension to support CBOR encoding
extension DeviceEngagement: CBOREncodable {
    // Converts the instance to a CBOR representation
    public func toCBOR(options: SwiftCBOR.CBOROptions) -> SwiftCBOR.CBOR {
        // Create a CBOR map with version and security values
        var res = CBOR.map([0: .utf8String(version), 1: security.toCBOR(options: options)])
        
        // Add device retrieval methods to the CBOR map if available
        if let drms = deviceRetrievalMethods {
            res[2] = .array(drms.map { $0.toCBOR(options: options) })
        }
        
        // Add optional RFUs (reserved for future use) to the CBOR map
        if let rfus = self.rfus {
            for (i, r) in rfus.enumerated() {
                res[.negativeInt(UInt64(i))] = .utf8String(r)
            }
        }
        
        // Return the final CBOR representation
        return res
    }
}

// Extension to support CBOR decoding
extension DeviceEngagement: CBORDecodable {
    // Initializer to create an instance from a CBOR map
    public init?(cbor: CBOR) throws {
        // Ensure the CBOR is a map; return nil if it is not
        guard case let .map(map) = cbor else { return nil }
        
        // Extract and validate the version value from the map, ensuring it starts with "1."
        guard let cv = map[0], case let .utf8String(v) = cv, v.prefix(2) == "1." else { return nil }
        
        // Extract and initialize the security value from the map
        guard let cs = map[1], let s = Security(cbor: cs) else { return nil }
        
        // Extract and initialize device retrieval methods if present
        if let cdrms = map[2], case let .array(drms) = cdrms, drms.count > 0 {
            deviceRetrievalMethods = try drms.compactMap(DeviceRetrievalMethod.init(cbor:))
        }
        
        // Set version and security properties
        version = v
        security = s
    }
}

extension DeviceEngagement {
    // Generates the QR code string from `qrCoded`
    var qrCode: String {
        "mdoc:" + Data(qrCoded!).base64URLEncodedString()
    }
    
    // Creates the payload for the QR code
    /// - Returns: A string representing the QR code payload
    public mutating func getQrCodePayload() -> String {
        // Encode the object with CBOR options and assign to `qrCoded`
        qrCoded = encode(options: CBOROptions())
        return qrCode
    }
}

public class DeviceEngagementBuilder {
    
    private var deviceEngagement: DeviceEngagement
    
    init(pk: CoseKeyPrivate, rfus: [String]? = nil) throws {
        guard let deviceEngagement = DeviceEngagement(pk: pk, rfus: rfus) else {
            throw ErrorHandler.unexpected_error
        }
        
        self.deviceEngagement = deviceEngagement
    }
    
    func setDeviceRetrievalMethods(_ retrievalMethods: [DeviceRetrievalMethod]) -> DeviceEngagementBuilder {
        self.deviceEngagement.deviceRetrievalMethods = retrievalMethods
        return self
    }
    
    func build() -> DeviceEngagement {
        return self.deviceEngagement
    }
}
