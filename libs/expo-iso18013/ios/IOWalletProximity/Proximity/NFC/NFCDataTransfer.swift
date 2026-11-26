//
//  NFCDataTransfer.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 16/02/26.
//

import CoreNFC
internal import SwiftCBOR

public enum ProximityNfcEvents {
    //The device is ready to present nfc document
    case onStart
    
    case onEngagementStart
    case onEngagementDone
    
    case onDataTransferStart
    
    //The device has stopped presenting nfc
    case onStop
    
    case onEngagementWithDisabledEngagement
    
}

@available(iOS 17.4, *)
class NFCDataTransfer : @unchecked Sendable, NFCCardEmulatorDelegate {
    
    public var transferDelegate: MdocTransferDelegate!
    
    public var nfcHandler: ((ProximityNfcEvents) -> Void)?
    
    func emulationStatusChanged(_ event: CardSession.Event) {
        print(event)
        switch(event) {
        case .sessionInvalidated(let reason):
            nfcHandler?(.onStop)
            break
        default:
            break
        }
    }
    
    
    private var ndef: [UInt8]
    private lazy var cardEmulator: NFCCardEmulator = NFCCardEmulator(delegate: self)
    
    private var _deviceEngagement: DeviceEngagement
    
    public var deviceRequest: DeviceRequest?
    
    public var sessionEncryption: SessionEncryption?
    
    private let dataTransferAID = "a0000002480400"
    private let engagementAID = "d2760000850101"
    
    private var allowEngagement: Bool = true
    
    init(_ deviceEngagement: DeviceEngagement, allowEngagement: Bool = true) {
        self.allowEngagement = allowEngagement
        let ndef = NfcUtils().createNdefMessageHandoverSelect(methods: deviceEngagement.deviceRetrievalMethods ?? [], encodedDeviceEngagement: Data(deviceEngagement.encode(options: CBOROptions()))).bytes
        
        _deviceEngagement = deviceEngagement
        
        self.ndef = ndef
        
        var card = NFCNDEFCardFileSystem(root: NFCNDEFFile(id: ""))
        
        card.root.addChild(NFCNDEFFile(id: dataTransferAID, value: []))
        
        if allowEngagement {
            card.root.addChild(NFCNDEFFile(id: engagementAID,
                                           children: [
                                            //CAPABILITY_CONTAINER_FILE
                                            NFCNDEFFile(id: "e103", value: [
                                                0x00, 0x0f,
                                                0x20,
                                                0x7f, 0xff,
                                                0x7f, 0xff,
                                                0x04, 0x06,
                                                0xe1, 0x04,
                                                0x7f, 0xff,
                                                0x00,
                                                0xff
                                            ]),
                                            //NDEF_FILE
                                            NFCNDEFFile(id: "e104", value: Utils.intToBin(ndef.count, pad: 4) + ndef)
                                           ]),)
        }
        
        self.nfcRoot = card
    }
    
    
    
    var handOver: CBOR? = BleTransferMode.QRHandover
    
    private func initHandover() {
        handOver =  CBOR.array([
            CBOR.byteString(self.ndef),
            CBOR.null
        ])
    }
    
    var nfcRoot: NFCNDEFCardFileSystem
    
    var message: Data?
    var messageToSend: [UInt8]?
    var messageToSendIndex = 0
    
    
    func setMessage(message: String) {
        cardEmulator.setMessage(message: message)
    }
    
    internal func processAPDU(_ cardSession: CardSession, _ apduRequest: APDURequest) async -> APDUResponse {
        print(apduRequest)
        
        var apduResponse: APDUResponse = APDUResponse([], .fileNotFound, extended: false)
        
        guard let instruction = APDUInstruction(rawValue: apduRequest.head.instruction) else {
            return apduResponse
        }
        
        switch(instruction) {
        case .SELECT:
            let id = apduRequest.data.hexEncodedString
            
            let status = nfcRoot.select(id: id)
            
            if (id == engagementAID) {
                if (status == .success) {
                    self.nfcHandler?(.onEngagementStart)
                }
                else {
                    self.nfcHandler?(.onEngagementWithDisabledEngagement)
                }
            }
            
            apduResponse = APDUResponse([], status, extended: false)
            break
        case .READ_BINARY:
            let offset = UInt16(low: apduRequest.head.p2, high: apduRequest.head.p1)
            
            let len = Int(apduRequest.le.hexEncodedString, radix: 16)!
            
            let (status, data, isLastRead) = nfcRoot.read(offset: Int(offset), len: len)
            
            apduResponse = APDUResponse(data ?? [], status, extended: apduRequest.le.count > 1)
            
            if nfcRoot.selectedId == "e104" && isLastRead {
                initHandover()
                self.nfcHandler?(.onEngagementDone)
            }
            
            break
            
        case .GET_RESPONSE:
            
            guard let response = messageToSend else {
                return APDUResponse([], .conditionsOfUseNotSatisfied, extended: false)
            }
            
            
            let expectedMessageLen = apduRequest.expectedResponseLength ?? 0
            
            var newMessageToSendIndex = messageToSendIndex + expectedMessageLen
            
            var isLast = newMessageToSendIndex > response.count
            
            if isLast {
                newMessageToSendIndex = response.count
            }
            
            let chunk = response[messageToSendIndex..<newMessageToSendIndex]
            messageToSendIndex = newMessageToSendIndex
            
            if isLast {
                apduResponse = APDUResponse([UInt8](chunk), .success, extended: true)
            }
            else {
                var stillAvailableBytes: UInt8 = 0xFF - 1
                let stillAvailable = response.count - (messageToSendIndex - expectedMessageLen)
                if stillAvailable < stillAvailableBytes {
                    stillAvailableBytes = UInt8(stillAvailable)
                }
                
                
                apduResponse = APDUResponse([UInt8](chunk), .bytesStillAvailable(stillAvailableBytes), extended: true)
                
            }
            break
            
        case .ENVELOPE:
            
            if apduRequest.head.instructionClass == 0x10 {
                if message == nil {
                    nfcHandler?(.onDataTransferStart)
                    message = Data(apduRequest.data)
                }
                else {
                    message?.append(contentsOf: Data(apduRequest.data))
                }
                
                apduResponse = APDUResponse([], .success, extended: false)
                
            }
            else {
                if message == nil {
                    nfcHandler?(.onDataTransferStart)
                    message = Data(apduRequest.data)
                }
                else {
                    message?.append(contentsOf: Data(apduRequest.data))
                }
                
                guard let message = message else {
                    return apduResponse
                }
                
                return await handleDeviceRequest(deviceRequestMessage: message)
            }
            
            break
        default:
            break
        }
        
        return apduResponse
    }
    
    
    func start() async throws -> Bool {
        return try await cardEmulator.start()
    }
    
    func stop() async throws {
        return try await cardEmulator.stop()
    }
    
    
    private func handleDeviceRequest(deviceRequestMessage: Data) async -> APDUResponse {
        let deviceRequest = extractFromDo53(encapsulatedData: deviceRequestMessage)
        
        if deviceRequest == nil {
            print("failed to decode devicerequest")
            return APDUResponse([], .fileNotFound, extended: false)
        }
        
        
        do {
            
            let deviceResponseResponse = MdocTransferHelpers.decodeRequest(deviceEngagement: _deviceEngagement, requestData: deviceRequest!, dauthMethod: .deviceSignature, readerKeyRawData: nil, handOver: handOver!)
            
            let result = try deviceResponseResponse.get()
            
            self.deviceRequest = result.deviceRequest
            self.sessionEncryption = result.sessionEncryption
            
            let sessionData: Data
            var errorStatusOut: UInt64 = 11
            do {
                sessionData = try await withCheckedThrowingContinuation({
                    continuation in
                    
                    transferDelegate?.didReceiveRequest(deviceRequest: result.deviceRequest, sessionEncryption: result.sessionEncryption, onResponse: {
                        userApproved, dr, errorStatus in
                        
                        errorStatusOut = errorStatus
                        
                        do {
                            
                            if !userApproved {
                                continuation.resume(throwing: ErrorHandler.userRejected)
                                return
                            }
                            
                            guard let deviceResponse = dr else {
                                continuation.resume(throwing: ErrorHandler.noDocumentToReturn)
                                return
                            }
                            
                            let sessionDataResult = try MdocHelpers.getSessionDataToSend(sessionEncryption: self.sessionEncryption, status: .requestReceived, docToSend: deviceResponse).get()
                            
                            continuation.resume(returning: sessionDataResult)
                        }
                        catch {
                            continuation.resume(throwing: error)
                        }
                    })
                })
            } catch {
                let resError = MdocHelpers.getSessionDataToSend(sessionEncryption: self.sessionEncryption, status: .error, docToSend: DeviceResponse(status: 0), errorStatus: errorStatusOut)
                var bytesToSend = (try? resError.get()) ?? Data()
                sessionData = bytesToSend
            }
            
            let sd = sessionData
            let response = [UInt8](encapsulateInDo53(data: sd))
            
            messageToSend = response
            
            let max = Int(_deviceEngagement.nfc_maxLenResponse ?? 65279)
            print(max)
            if (response.count > max) {
                let chunk = messageToSend![0..<max]
                messageToSendIndex += chunk.count
                return APDUResponse([UInt8](chunk), .bytesStillAvailable(0xFF - 1), extended: true)
            }
            else {
                self.transferDelegate.didChangeStatus(.responseSent)
                return APDUResponse(response, .success, extended: false)
            }
            
        }
        catch {
            print(error)
            self.transferDelegate.didChangeStatus(.error)
            return APDUResponse([], .fileNotFound, extended: false)
        }
    }
    
    
    
    
    private func extractFromDo53(encapsulatedData: Data) -> Data? {
        
        guard let tag = encapsulatedData.first else {
            return nil
        }
        
        if tag != 0x53 {
            return nil
        }
        
        if encapsulatedData.count < 2 {
            return nil
        }
        
        let length: UInt8 = encapsulatedData[1]
        
        var offset = 2
        let newLength: Int
        switch length {
        case 0x80:
            return nil
        case 0x81:
            if encapsulatedData.count < 3 {
                return nil
            }
            newLength = Int(encapsulatedData[2])
            offset += 1
        case 0x82:
            if encapsulatedData.count < 4 {
                return nil
            }
            let value: UInt16 = UInt16(encapsulatedData[2]) << 8 | UInt16(encapsulatedData[3])
            newLength = Int(value)
            offset += 2
        case 0x83:
            if encapsulatedData.count < 5 {
                return nil
            }
            let dimension = encapsulatedData[2]
            let value: UInt16 = UInt16(encapsulatedData[3]) << 8 | UInt16(encapsulatedData[4])
            newLength = Int(dimension) * 0x10000 + Int(value)
            offset += 3
        default:
            newLength = Int(length)
        }
        
        print(newLength)
        
        if newLength == 0 {
            return Data()
        }
        
        if offset + newLength > encapsulatedData.count {
            return nil
        }
        
        return encapsulatedData.subdata(in: offset..<offset+newLength)
        
        
    }
    
    private func encapsulateInDo53(data: Data) -> Data {
        
        var result = Data()
        
        result.append(0x53)
        if (data.count < 0x80) {
            result.append(UInt8(data.count))
        } else if (data.count < 0x100) {
            result.append(0x81)
            result.append(UInt8(data.count))
        } else if (data.count < 0x10000) {
            result.append(0x82)
            result.appendUInt16(UInt16(data.count))
        } else if (data.count < 0x1000000) {
            result.append(0x83)
            result.append(UInt8(data.count / 0x10000))
            result.appendUInt16(UInt16(data.count & 0xFFFF))
        }
        result.append(contentsOf: data)
        
        return result
    }
    
    
}
