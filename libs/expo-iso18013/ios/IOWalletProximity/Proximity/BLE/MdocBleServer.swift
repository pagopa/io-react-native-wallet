//
//  MdocBleServer.swift
//  libIso18013
//
//  Created by Antonio on 18/10/24.
//

import CoreBluetooth
internal import SwiftCBOR
internal import X509

protocol MdocTransferDelegate: AnyObject {
    func didChangeStatus(_ newStatus: TransferStatus)
    func didFinishedWithError(_ error: Error)
    func didReceiveRequest(deviceRequest: DeviceRequest, sessionEncryption: SessionEncryption, onResponse: @escaping (Bool, DeviceResponse?, UInt64) -> Void)
}

class MdocBleServer : @unchecked Sendable {
    var peripheralManager: CBPeripheralManager!
    var bleDelegate: MdocBleDelegate!
    var remoteCentral: CBCentral!
    public var deviceEngagement: DeviceEngagement?

    public var deviceRequest: DeviceRequest?

    public var sessionEncryption: SessionEncryption?

    public var dauthMethod: DeviceAuthMethod = .deviceSignature

    public weak var delegate: (any MdocTransferDelegate)?


    var stateCharacteristic: CBMutableCharacteristic!
    var server2ClientCharacteristic: CBMutableCharacteristic!

    public var status: TransferStatus = .initializing { willSet { handleStatusChange(newValue) } }
    public var error: Error? = nil  { willSet { handleErrorSet(newValue) }}

    var readBuffer = Data()
    var sendBuffer = [Data]()
    var numBlocks: Int = 0
    var subscribeCount: Int = 0

    // SessionData status sent with the last response, nil if nothing was sent in the current session
    var sentSessionDataStatus: UInt64? = nil

    // Every status in Table 20 of ISO 18013-5 (10, 11, 20) requires the session to be terminated
    var sessionTerminationSent: Bool {
        sentSessionDataStatus.flatMap { SessionDataStatus(rawValue: $0) } != nil
    }

    var handOver: CBOR = BleTransferMode.QRHandover

    var initSuccess: Bool = false

    public var advertising: Bool = false

    var isPreview: Bool {
        ProcessInfo.processInfo.environment["XCODE_RUNNING_FOR_PREVIEWS"] == "1"
    }

    var isInErrorState: Bool { status == .error }

    func handleStatusChange(_ newValue: TransferStatus) {
        guard !isPreview && !isInErrorState else { return }
        print("Transfer status will change to \(newValue)")
        delegate?.didChangeStatus(newValue)
        if newValue == .requestReceived {
            peripheralManager.stopAdvertising()

            let deviceResponse = MdocTransferHelpers.decodeRequest(deviceEngagement: deviceEngagement, requestData: readBuffer, dauthMethod: dauthMethod, readerKeyRawData: nil, handOver: handOver)

            switch(deviceResponse) {
                case .success(let result):
                    self.deviceRequest = result.deviceRequest
                    self.sessionEncryption = result.sessionEncryption


                    delegate?.didReceiveRequest(deviceRequest: result.deviceRequest, sessionEncryption: result.sessionEncryption, onResponse: onUserResponse)


                case .failure(let error):
                    self.error = error

            }
        }
        else if newValue == .initialized {
            bleDelegate = MdocBleDelegate(server: self)
            print("Initializing BLE peripheral manager")
            peripheralManager = CBPeripheralManager(delegate: bleDelegate, queue: nil)
            subscribeCount = 0
        } else if newValue == .disconnected && status != .disconnected {
            stop()
        }
    }

    func start() {
        guard !isPreview && !isInErrorState else {
            print("Current status is \(status)")
            return
        }
        if peripheralManager.state == .poweredOn {
            print("Peripheral manager powered on")
            error = nil
            sentSessionDataStatus = nil
            // get the BLE UUID from the device engagement and truncate it to the first 4 characters (short UUID)
            guard var uuid = deviceEngagement!.ble_uuid else {
                print("BLE initialization error")
                return
            }
            let index = uuid.index(uuid.startIndex, offsetBy: 4)
            uuid = String(uuid[index...].prefix(4)).uppercased()
            buildServices(uuid: uuid)
            let advertisementData: [String: Any] = [ CBAdvertisementDataServiceUUIDsKey: [CBUUID(string: uuid)], CBAdvertisementDataLocalNameKey: uuid ]
            // advertise the peripheral with the short UUID
            peripheralManager.startAdvertising(advertisementData)
            advertising = true
            status = .qrEngagementReady
        } else {
            // once bt is powered on, advertise
            if peripheralManager.state == .resetting {
                DispatchQueue.main.asyncAfter(deadline: .now()+1) {
                    self.start()
                }
            } else {
                print("Peripheral manager powered off")
            }
        }
    }

    func buildServices(uuid: String) {
        let bleUserService = CBMutableService(type: CBUUID(string: uuid), primary: true)

        stateCharacteristic = CBMutableCharacteristic(
            type: MdocServiceCharacteristic.state.uuid,
            properties: [.notify, .writeWithoutResponse],
            value: nil,
            permissions: [.writeable])

        let client2ServerCharacteristic = CBMutableCharacteristic(
            type: MdocServiceCharacteristic.client2Server.uuid,
            properties: [.writeWithoutResponse],
            value: nil,
            permissions: [.writeable])

        server2ClientCharacteristic = CBMutableCharacteristic(
            type: MdocServiceCharacteristic.server2Client.uuid,
            properties: [.notify],
            value: nil,
            permissions: [])

        bleUserService.characteristics = [stateCharacteristic, client2ServerCharacteristic, server2ClientCharacteristic]

        peripheralManager.removeAllServices()
        peripheralManager.add(bleUserService)
    }

    public func stop() {
        guard !isPreview else {
            return
        }

        if let peripheralManager,
           peripheralManager.isAdvertising {
            peripheralManager.stopAdvertising()
        }
        //qrCodePayload = nil
        advertising = false
        subscribeCount = 0

        if status == .error && initSuccess {
            status = .initializing
        }
    }

    public func onUserResponse(_ userApproved: Bool, _ deviceResponse: DeviceResponse?, errorStatus: UInt64) {
        status = .userSelected

        if !userApproved {
            sendError(nil, errorStatus: errorStatus)
            return
        }

        guard let deviceResponse = deviceResponse else {
            sendError(ErrorHandler.noDocumentToReturn, errorStatus: errorStatus)
            return
        }

        let sessionDataResult = MdocHelpers.getSessionDataToSend(sessionEncryption: sessionEncryption, status: .requestReceived, docToSend: deviceResponse)

        switch(sessionDataResult) {
            case .failure(let error):
                sendError(error)
                return
            case .success(let sessionData):
                // getSessionDataToSend always attaches status 20 to a successful response
                sendData(sessionData, sessionDataStatus: SessionDataStatus.sessionTermination.rawValue)
        }
    }

    func sendError(_ errorToSend: Error?, errorStatus: UInt64 = 11) {
        let resError = MdocHelpers.getSessionDataToSend(sessionEncryption: sessionEncryption, status: .error, docToSend: DeviceResponse(status: 0), errorStatus: errorStatus)
        var bytesToSend = try! resError.get()

        sendData(bytesToSend, errorToSend, sessionDataStatus: errorStatus)
    }

    func sendData(_ bytesToSend: Data, _ errorToSend: Error? = nil, sessionDataStatus: UInt64) {
        sentSessionDataStatus = sessionDataStatus
        prepareDataToSend(bytesToSend)
        DispatchQueue.main.asyncAfter(deadline: .now()+0.2) {
            self.sendDataWithUpdates()
            self.error = errorToSend
        }
    }

    func handleErrorSet(_ newValue: Error?) {
        guard let newValue else { return }
        status = .error
        delegate?.didFinishedWithError(newValue)
        print("Transfer error \(newValue) (\(newValue.localizedDescription)")
    }

    func prepareDataToSend(_ msg: Data) {
        let mbs = min(511, remoteCentral.maximumUpdateValueLength-1)
        numBlocks = MdocHelpers.CountNumBlocks(dataLength: msg.count, maxBlockSize: mbs)
        print("Sending response of total bytes \(msg.count) in \(numBlocks) blocks and block size: \(mbs)")
        sendBuffer.removeAll()
        // send blocks
        for i in 0..<numBlocks {
            let (block,bEnd) = MdocHelpers.CreateBlockCommand(data: msg, blockId: i, maxBlockSize: mbs)
            var blockWithHeader = Data()
            blockWithHeader.append(contentsOf: !bEnd ? BleTransferMode.START_DATA : BleTransferMode.END_DATA)
            // send actual data after header
            blockWithHeader.append(contentsOf: block)
            sendBuffer.append(blockWithHeader)
        }
    }

    func sendDataWithUpdates() {
        guard !isPreview else { return }
        guard sendBuffer.count > 0 else {
            status = .responseSent
            print("Finished sending BLE data")
            stop()
            return
        }
        let b = peripheralManager.updateValue(sendBuffer.first!, for: server2ClientCharacteristic, onSubscribedCentrals: [remoteCentral])
        if b, sendBuffer.count > 0 {
            sendBuffer.removeFirst()
            sendDataWithUpdates()
        }
    }
}

@objc(CBPeripheralManagerDelegate)
class MdocBleDelegate : NSObject, CBPeripheralManagerDelegate {
    unowned var server: MdocBleServer

    init(server: MdocBleServer) {
        self.server = server
    }

    func peripheralManagerIsReady(toUpdateSubscribers peripheral: CBPeripheralManager) {
        if server.sendBuffer.count > 0 { self.server.sendDataWithUpdates() }
    }

    func peripheralManagerDidUpdateState(_ peripheral: CBPeripheralManager) {
        print("CBPeripheralManager didUpdateState:")
        print(peripheral.state == .poweredOn ? "Powered on" : peripheral.state == .unauthorized ? "Unauthorized" : peripheral.state == .unsupported ? "Unsupported" : "Powered off")
        if peripheral.state == .poweredOn
        /*,server.qrCodePayload != nil*/ {
            server.start()
        }
    }

    func peripheralManager(_ peripheral: CBPeripheralManager, didReceiveWrite requests: [CBATTRequest]) {
        if requests[0].characteristic.uuid == MdocServiceCharacteristic.state.uuid, let h = requests[0].value?.first {
            if h == BleTransferMode.START_REQUEST.first! {
                //logger.info("Start request received to state characteristic") // --> start
                server.status = .started
                server.readBuffer.removeAll()
            }
            else if h == BleTransferMode.END_REQUEST.first! {
                guard server.status == .responseSent else {
                    print("State END command rejected. Not in responseSent state")
                    peripheral.respond(to: requests[0], withResult: .unlikelyError)
                    return
                }
                //logger.info("End received to state characteristic") // --> end
                server.status = .disconnected
            }
        } else if requests[0].characteristic.uuid == MdocServiceCharacteristic.client2Server.uuid {
            for r in requests {
                guard let data = r.value, let h = data.first else { continue }
                let bStart = h == BleTransferMode.START_DATA.first!
                let bEnd = (h == BleTransferMode.END_DATA.first!)
                if data.count > 1 { server.readBuffer.append(data.advanced(by: 1)) }
                if !bStart && !bEnd {
                    //logger.warning("Not a valid request block: \(data)")
                }
                if bEnd { server.status = .requestReceived  }
            }
        }
        peripheral.respond(to: requests[0], withResult: .success)
    }

    public func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didSubscribeTo characteristic: CBCharacteristic) {
        guard server.status == .qrEngagementReady else { return }
        let mdocCbc = MdocServiceCharacteristic(uuid: characteristic.uuid)
        print("Remote central \(central.identifier) connected for \(mdocCbc?.rawValue ?? "") characteristic")
        server.remoteCentral = central
        if characteristic.uuid == MdocServiceCharacteristic.state.uuid || characteristic.uuid == MdocServiceCharacteristic.server2Client.uuid { server.subscribeCount += 1 }
        if server.subscribeCount > 1 { server.status = .connected }
    }

    public func peripheralManager(_ peripheral: CBPeripheralManager, central: CBCentral, didUnsubscribeFrom characteristic: CBCharacteristic) {
        let mdocCbc = MdocServiceCharacteristic(uuid: characteristic.uuid)
        print("Remote central \(central.identifier) disconnected for \(mdocCbc?.rawValue ?? "") characteristic")

        switch server.status {
        case .disconnected, .error:
            return
        case .responseSent where server.sessionTerminationSent:
            // The response SessionData carried a session termination status, so the reader is allowed to
            // unsubscribe and disconnect without sending the END command on the State characteristic
            server.status = .disconnected
        default:
            server.error = ProximityError.disconnectedWithoutProperSessionTermination
        }
    }
}
