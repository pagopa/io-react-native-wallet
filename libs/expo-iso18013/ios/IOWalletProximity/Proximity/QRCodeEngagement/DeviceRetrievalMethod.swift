//
//  DeviceRetrievalMethod.swift
//  libIso18013
//
//  Created by Martina D'urso on 15/10/24.
//

import Foundation
internal import SwiftCBOR

// A `DeviceRetrievalMethod` holds two mandatory values (type and version).
/// The first element defines the type and the second element defines the version for the transfer method.
/// Additionally, it may contain extra info for each connection.
 enum DeviceRetrievalMethod: Equatable {
    // Version of the DeviceRetrievalMethod
    static var version: UInt64 { 1 }
    
    // QR retrieval method
    case qr
     
    // NFC retrieval method with maxLen command and response
    case nfc(maxLenCommand: UInt64, maxLenResponse: UInt64)
     
    // BLE retrieval method with server/client mode and UUID
    case ble(isBleServer: Bool, uuid: String)
    
    // Base suffix for BLE UUID service
    static let BASE_UUID_SUFFIX_SERVICE = "-0000-1000-8000-00805F9B34FB".replacingOccurrences(of: "-", with: "")
    
    // Generates a random BLE UUID
    static func getRandomBleUuid() -> String {
        let uuidFull = UUID().uuidString.replacingOccurrences(of: "-", with: "")
        let index = uuidFull.index(uuidFull.startIndex, offsetBy: 4)
        let uuid = String(uuidFull[index...].prefix(4))
        return "0000\(uuid)\(BASE_UUID_SUFFIX_SERVICE)"
    }
}

// Extension to make DeviceRetrievalMethod conform to CBOREncodable
extension DeviceRetrievalMethod: CBOREncodable {
    // Appends the type and version to the CBOR array
    static func appendTypeAndVersion(_ cborArr: inout [CBOR], type: UInt64) {
        cborArr.append(.unsignedInt(type))
        cborArr.append(.unsignedInt(version))
    }
    
    // Converts the instance to CBOR representation
    public func toCBOR(options: CBOROptions) -> CBOR {
        var cborArr = [CBOR]()
        switch self {
            case .qr:
                // Append type and version for QR method
                Self.appendTypeAndVersion(&cborArr, type: 0)
            
            case .nfc(let maxLenCommand, let maxLenResponse):
                // Append type and version for NFC method
                Self.appendTypeAndVersion(&cborArr, type: 1)
                // Add additional NFC-specific information to the CBOR map
                let options: CBOR = [0: .unsignedInt(maxLenCommand), 1: .unsignedInt(maxLenResponse)]
                cborArr.append(options)
            
            case .ble(let isBleServer, let uuid):
                // Append type and version for BLE method
                Self.appendTypeAndVersion(&cborArr, type: 2)
                // Add additional BLE-specific information to the CBOR map
                let options: CBOR = [
                    0: .boolean(isBleServer),
                    1: .boolean(!isBleServer),
                    .unsignedInt(isBleServer ? 10 : 11): .byteString(uuid.byteArray)
                ]
                cborArr.append(options)
        }
        return .array(cborArr)
    }
}

// Extension to make DeviceRetrievalMethod conform to CBORDecodable
extension DeviceRetrievalMethod: CBORDecodable {
    // Initializes an instance from a CBOR representation
    public init?(cbor: CBOR) throws {
        // Ensure the CBOR is an array with at least two elements
        guard case let .array(arr) = cbor, arr.count >= 2 else { return nil }
        // Extract the type and version from the array
        guard case let .unsignedInt(type) = arr[0] else { return nil }
        guard case let .unsignedInt(v) = arr[1], v == Self.version else { return nil }
        
        // Decode based on the type
        switch type {
            case 0:
                // Initialize as QR method
                self = .qr
            case 1:
                // Extract the NFC-specific options from the CBOR map
                guard arr.count >= 3 else { return nil }
                guard case let .map(options) = arr[2] else { return nil }
                guard case let .unsignedInt(mlc) = options[0], case let .unsignedInt(mlr) = options[1]  else {
                return nil }
                self = .nfc(maxLenCommand: mlc, maxLenResponse: mlr)
            case 2:
                // Extract the BLE-specific options from the CBOR map
                guard arr.count >= 3 else { return nil }
                guard case let .map(options) = arr[2] else { return nil }
                if case let .boolean(b) = options[0], b, case let .byteString(bytes) = options[10] {
                    // Initialize as BLE server
                    self = .ble(isBleServer: b, uuid: bytes.hex)
                } else if case let .boolean(b) = options[1], b, case let .byteString(bytes) = options[11] {
                    // Initialize as BLE client
                    self = .ble(isBleServer: !b, uuid: bytes.hex)
                } else {
                    return nil
                }
            default:
                return nil
        }
    }
}
