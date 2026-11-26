//
//  LibIso18013Proximity.swift
//  libIso18013
//
//  Created by Martina D'urso on 16/10/24.
//

internal import SwiftCBOR
import Foundation
import CoreBluetooth

// Protocol defining a listener for QR engagement events
protocol QrEngagementListener: AnyObject {
    // Called when the connection process is starting
    func didChangeStatus(_ newStatus: TransferStatus)
    
    func didReceiveRequest(deviceRequest: DeviceRequest, sessionEncryption: SessionEncryption, onResponse: @escaping (Bool, DeviceResponse?, UInt64) -> Void)
    
    func didFinishedWithError(_ error: any Error)
    
}


class LibIso18013Proximity: @unchecked Sendable {
    // Property to hold device engagement information
    var deviceEngagement: DeviceEngagement?
    
    var _deviceRetrivalMethods: [ISO18013DataTransferMode] = [.ble, .nfc]
    
    var bleServer: MdocBleServer?
    var bleDelegate: MdocTransferDelegate?
    
    // Weak reference to a listener for QR engagement events
    weak var listener: QrEngagementListener?
    
    // Singleton instance of LibIso18013Proximity
    public static let shared = LibIso18013Proximity()
    
    // Sets the listener for QR engagement events
    public func setListener(_ listener: QrEngagementListener) {
        self.listener = listener
    }
    
    public func stop() {
        deviceEngagement = nil
        bleServer?.stop()
    }
    
    private var _nfc: AnyObject?
    
    public var nfcHandler: ((ProximityNfcEvents) -> Void)?
    
    private var retrivalMethodsStarted: Bool = false
    
    @available(iOS 17.4, *)
    public func startNfcDataTransfer(_ allowEngagement: Bool = false) async throws -> Bool {
        print("startNfcDataTransfer allowEngagement: \(allowEngagement)")
        do {
            guard let deviceEngagement = self.deviceEngagement else {
                return false
            }
            
            guard let listener = listener else {
                throw ErrorHandler.unexpected_error
            }
            
            let nfc: NFCDataTransfer = NFCDataTransfer(
                deviceEngagement,
            allowEngagement: allowEngagement)
            
            nfc.transferDelegate = BleDelegate(listener: listener)
            
            nfc.nfcHandler = {
                status in
                
                if (status == .onEngagementDone) {
                    print("onEngagementDone")
                    self.bleServer?.handOver = nfc.handOver!
                }
                
                self.nfcHandler?(status)
            }
            
            _nfc = nfc
            
           
            
            let success = try await nfc.start()
            
            if (success) {
                nfcHandler?(.onStart)
            }
            else {
                nfcHandler?(.onStop)
            }
            
            
            return success
            
        }
        catch {
            throw ProximityError.error(error: error)
        }
        return false
    }
    
    @available(iOS 17.4, *)
    public func setNfcHceMessage(message: String) {
        guard let nfc = _nfc as? NFCDataTransfer else {
            return
        }
        
        nfc.setMessage(message: message)
    }
    
    
    // Start nfc
    @available(iOS 17.4, *)
    public func startNfcEngagement(_ deviceRetrivalMethods: [ISO18013DataTransferMode] = [.ble, .nfc], isLateNfc: Bool, allowEngagement: Bool) async throws -> Bool {
        print("startNfcEngagement")
        do {
        
            try initDeviceEngagement(deviceRetrivalMethods)
            
            try startRetrivalMethods(deviceRetrivalMethods, true, isNfcLateEngagement: isLateNfc)
            
            
            
            if deviceRetrivalMethods.contains(.nfc) {
                return true
            }
            
            guard let deviceEngagement = self.deviceEngagement else {
                return false
            }
            
            let nfc: NFCDataTransfer = NFCDataTransfer(
                deviceEngagement)
            
            nfc.nfcHandler = {
                status in
                
                if (status == .onEngagementDone) {
                    self.bleServer?.handOver = nfc.handOver!
                }
                
                self.nfcHandler?(status)
            }
            
            
            _nfc = nfc
            
            //bleServer?.handOver = nfc.handOver
            
            let success = try await nfc.start()
            
            if (success) {
                nfcHandler?(.onStart)
            }
            else {
                nfcHandler?(.onStop)
            }
            
            
            return success
            
        }
        catch {
            throw ProximityError.error(error: error)
        }
        return false
    }
    
    // Stop nfc
    
    
    @available(iOS 17.4, *)
    public func stopNfc() async throws -> Bool {
        print("stopNfc")
        
        deviceEngagement = nil
        retrivalMethodsStarted = false
        guard let nfc = _nfc as? NFCDataTransfer else {
            return false
        }
        
        try await nfc.stop()
        
        return true
    }
    
    
    // Generates and returns the QR code payload
    public func getQrCodePayload(_ deviceRetrivalMethods: [ISO18013DataTransferMode] = [.ble, .nfc], isNfcLateEngagement: Bool = false, allowNfcEngagement: Bool = false) throws -> String {
        
        try initDeviceEngagement(deviceRetrivalMethods)
        
        try startRetrivalMethods(deviceRetrivalMethods, allowNfcEngagement, isNfcLateEngagement: isNfcLateEngagement)
        
        // Try to get the QR code payload from device engagement, throw an error if it is not available
        guard let qrCodePayload = deviceEngagement?.getQrCodePayload() else {
            throw ErrorHandler.qrCodePayloadNotFound
        }
        
        // Return the generated QR code payload
        return qrCodePayload
    }
    
    private func startRetrivalMethods(_ deviceRetrivalMethods: [ISO18013DataTransferMode], _ allowEngagement: Bool, isNfcLateEngagement: Bool = false) {
        
        print("startRetrivalMethods allowEngagement: \(allowEngagement) isLate: \(isNfcLateEngagement)")
        
        if retrivalMethodsStarted {
            print("retrivalMethods already started")
            
            if isNfcLateEngagement {
                print("retrivalMethods already started and isNfcLateEngagement")
                return
            }
            
           
        }
        
        retrivalMethodsStarted = true
        
        deviceRetrivalMethods.forEach({
            retrivalMethod in
            do {
                print(retrivalMethod)
                switch(retrivalMethod) {
                case .ble:
                    try? initBleServer()
                    break
                case .nfc:
                    print("isNfcLateEngagement: \(isNfcLateEngagement)")
                    if !isNfcLateEngagement {
                        if #available(iOS 17.4, *) {
                            Task {
                                try await startNfcDataTransfer(allowEngagement)
                            }
                        } else {
                            // No NFC supported
                        }
                    }
                    break
                default:
                    break
                }
            }
            catch {
                print(error)
            }
        })
        
        
        
        _deviceRetrivalMethods = deviceRetrivalMethods
    }
    
    private func initDeviceEngagement(_ deviceRetrivalMethods: [ISO18013DataTransferMode]) throws {
        print("initDeviceEngagement")
        
        if (deviceEngagement != nil) {
            return
        }
        
        guard let deviceEngagementBuilder = try? DeviceEngagementBuilder(pk: LibIso18013Utils.shared.createSecurePrivateKey()) else {
            throw ErrorHandler.unexpected_error
        }
        
        let retrivalMethods: [DeviceRetrievalMethod] = deviceRetrivalMethods.map({
            $0.retrivalMethod
        })
        
        // Initialize device engagement with required parameters
        deviceEngagement = deviceEngagementBuilder.setDeviceRetrievalMethods(retrivalMethods).build()
        
        
        
        
    }
    
    private func initBleServer() throws {
        
        guard let listener = listener else {
            throw ErrorHandler.unexpected_error
        }
        
        let server = MdocBleServer()
        
        server.deviceEngagement = deviceEngagement
        
        bleServer = server
        
        self.bleDelegate = BleDelegate(listener: listener)
        
        bleServer?.delegate = bleDelegate
        
        server.status = .initialized
        
        server.start()
    }
    
    
    class BleDelegate : MdocTransferDelegate {
        var listener: QrEngagementListener
        
        init(listener: QrEngagementListener) {
            self.listener = listener
        }
        
        func didChangeStatus(_ newStatus: TransferStatus) {
            listener.didChangeStatus(newStatus)
        }
        
        func didFinishedWithError(_ error: any Error) {
            listener.didFinishedWithError(error)
        }
        
        func didReceiveRequest(deviceRequest: DeviceRequest, sessionEncryption: SessionEncryption, onResponse: @escaping (Bool, DeviceResponse?, UInt64) -> Void) {
            listener.didReceiveRequest(deviceRequest: deviceRequest, sessionEncryption: sessionEncryption, onResponse: onResponse)
        }
    }
}
