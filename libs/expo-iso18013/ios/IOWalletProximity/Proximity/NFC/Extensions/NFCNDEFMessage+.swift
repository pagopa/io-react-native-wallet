//
//  NFCNDEFMessage+.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 01/12/25.
//

import CoreNFC

extension NFCNDEFMessage {

    func toByteArray() -> Data {
        var full = Data()

        let count = records.count

        for (i, r) in records.enumerated() {

            var recordData = Data()

            // TNF + Flags
            var tnfByte = UInt8(r.typeNameFormat.rawValue)

            if i == 0 { tnfByte |= 0x80 }     // MB (message begin)
            if i == count - 1 { tnfByte |= 0x40 } // ME (message end)

            // Short record flag (SR)
            if r.payload.count < 256 {
                tnfByte |= 0x10
            }

            // ID_PRESENT
            if !r.identifier.isEmpty {
                tnfByte |= 0x08
            }

            recordData.append(tnfByte)

            // TYPE LENGTH
            recordData.append(UInt8(r.type.count))

            // PAYLOAD LENGTH
            if r.payload.count < 256 {
                recordData.append(UInt8(r.payload.count))
            } else {
                var len = UInt32(r.payload.count)
                recordData.append(contentsOf: withUnsafeBytes(of: len.littleEndian) { Data($0)})
            }

            // ID LENGTH
            if !r.identifier.isEmpty {
                recordData.append(UInt8(r.identifier.count))
            }

            // TYPE
            recordData.append(r.type)

            // ID
            if !r.identifier.isEmpty {
                recordData.append(r.identifier)
            }

            // PAYLOAD
            recordData.append(r.payload)

            full.append(recordData)
        }

        return full
    }
}
