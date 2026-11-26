//
//  NFCNDEFPayload+.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 01/12/25.
//

import CoreNFC

extension NFCNDEFPayload {

    func toByteArray() -> Data {
        var data = Data()

        // TNF + Flags (assumo short record SR=1)
        let tnfByte = UInt8(self.typeNameFormat.rawValue | 0x10)  // SR=1
        data.append(tnfByte)

        // TYPE LENGTH
        data.append(UInt8(type.count))

        // PAYLOAD LENGTH (1 byte perché SR=1)
        data.append(UInt8(payload.count))

        // ID LENGTH (only if ID present)
        if !identifier.isEmpty {
            data.append(UInt8(identifier.count))
        }

        // TYPE
        data.append(type)

        // ID (optional)
        if !identifier.isEmpty {
            data.append(identifier)
        }

        // PAYLOAD
        data.append(payload)

        return data
    }
}
