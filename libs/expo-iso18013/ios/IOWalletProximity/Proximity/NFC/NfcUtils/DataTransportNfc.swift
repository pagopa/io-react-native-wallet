//
//  DataTransportNfc.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 01/12/25.
//


import CoreNFC

enum DataTransportNfc {

    static func toNdefRecord(
        _ cm: ConnectionMethodNfc,
        _ auxiliaryReferences: [String],
        _ isForHandoverSelect: Bool
    ) -> (NFCNDEFPayload, Data)? {

        // --------------------------
        // 1) Carrier Configuration Record
        // --------------------------

        let ccrPayload = cm.payload

        let carrierConfigRecord = NFCNDEFPayload(
            format: .nfcWellKnown,
            type: "cn".data(using: .utf8)!, // custom type
            identifier: Data(),
            payload: ccrPayload
        )

        // --------------------------
        // 2) Alternative Carrier Record
        // --------------------------

        var acrPayload = Data()

        // NFC is considered "active" carrier
        acrPayload.append(0x01)

        // Carrier data reference
        let carrierRef = "nfc".data(using: .utf8)!
        acrPayload.append(UInt8(carrierRef.count))
        acrPayload.append(carrierRef)

        // Auxiliary references
        acrPayload.append(UInt8(auxiliaryReferences.count))
        for ref in auxiliaryReferences {
            let r = ref.data(using: .utf8)!
            acrPayload.append(UInt8(r.count))
            acrPayload.append(r)
        }

        return (carrierConfigRecord, acrPayload)
    }
}
