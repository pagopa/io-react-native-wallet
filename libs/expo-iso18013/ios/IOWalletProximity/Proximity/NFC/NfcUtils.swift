//
//  NfcUtils.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 01/12/25.
//

import Foundation
import CoreNFC

class NfcUtils {
    
    private func calculateHandoverSelectPayload(
        alternativeCarrierRecords: [Data]
    ) -> Data {
        
        var payload = Data()
        payload.append(0x15)   // Version 1.5
        
        // Convert each alternative carrier record into NDEF record
        var acRecords: [NFCNDEFPayload] = []
        
        for acRecordPayload in alternativeCarrierRecords {
            let record = NFCNDEFPayload(
                format: .nfcWellKnown,
                type: "ac".data(using: .utf8)!,
                identifier: Data(),
                payload: acRecordPayload
            )
            acRecords.append(record)
        }
        
        // Create nested NDEF message
        let hsMessage = NFCNDEFMessage(records: acRecords)
        
        // Append encoded HS message
        payload.append(hsMessage.toByteArray())
        
        return payload
    }
    
    private func createNdefMessageHandoverSelectOrRequest(
        methods: [DeviceRetrievalMethod],
        encodedDeviceEngagement: Data?,
        encodedReaderEngagement: Data?,
        //options: DataTransportOptions?
    ) -> Data {
        
        var isHandoverSelect = false
        if encodedDeviceEngagement != nil {
            isHandoverSelect = true
            precondition(encodedReaderEngagement == nil,
                         "Cannot have readerEngagement in Handover Select")
        }
        
        var auxiliaryReferences: [String] = []
        if isHandoverSelect {
            auxiliaryReferences.append("mdoc")
        }
        
        var carrierConfigurationRecords: [NFCNDEFPayload] = []
        var alternativeCarrierRecords: [Data] = []
        
        for cm in methods {
            if let (configRecord, alternativeCarrier) = cm.toNdefRecord(auxiliaryReferences, isHandoverSelect) {
                alternativeCarrierRecords.append(alternativeCarrier)
                carrierConfigurationRecords.append(configRecord)
            }
        }
        
        // Build HS/Hr payload
        let hsPayload = calculateHandoverSelectPayload(
            alternativeCarrierRecords: alternativeCarrierRecords
        )
        
        var finalRecords: [NFCNDEFPayload] = []
        
        // Hs or Hr record
        let hsRecord = NFCNDEFPayload(
            format: .nfcWellKnown,
            type: (isHandoverSelect ? "Hs" : "Hr").data(using: .utf8)!,
            identifier: Data(),
            payload: hsPayload
        )
        finalRecords.append(hsRecord)
        
        if let deviceEngagement = encodedDeviceEngagement {
            let record = NFCNDEFPayload(
                format: .nfcExternal,
                type: "iso.org:18013:deviceengagement".data(using: .utf8)!,
                identifier: "mdoc".data(using: .utf8)!,
                payload: deviceEngagement
            )
            finalRecords.append(record)
        }
        
        if let readerEngagement = encodedReaderEngagement {
            let record = NFCNDEFPayload(
                format: .nfcExternal,
                type: "iso.org:18013:readerengagement".data(using: .utf8)!,
                identifier: "mdocreader".data(using: .utf8)!,
                payload: readerEngagement
            )
            finalRecords.append(record)
        }
        
        // Append carrier configs
        finalRecords.append(contentsOf: carrierConfigurationRecords)
        
        let message = NFCNDEFMessage(records: finalRecords)
        return message.toByteArray()
    }
    
    func createNdefMessageHandoverSelect(
        methods: [DeviceRetrievalMethod],
        encodedDeviceEngagement: Data,
    ) -> Data {
        return createNdefMessageHandoverSelectOrRequest(
            methods: methods,
            encodedDeviceEngagement: encodedDeviceEngagement,
            encodedReaderEngagement: nil,
        )
    }
    
}
