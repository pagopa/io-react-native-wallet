//
//  ISO18013.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 26/02/26.
//
import Foundation
import CoreNFC

public enum ISO18013Event: Sendable {
    case qrCode(String)
    
    //An error occurred
    case error(Error)
    
    //The device is connecting to the verifier app
    case bleConnecting
    
    //The device has connected to the verifier app
    case bleConnected
    
    //NFC Host Card Emulation Started
    case nfcStarted
    //NFC Host Card Emulation Stopped
    case nfcStopped
    
    //NFC Host Card Emulation Engagement Started
    case nfcEngagementStarted
    
    //NFC Host Card Emulation Engagement Completed
    case nfcEngagementDone
    
    //The device has received a new request from the verifier app
    case dataTransferStarted(ISO18013DataTransferArgs)
    
    //The device has received the termination flag from the verifier app
    case dataTransferStopped
}

// Request from the verifier app
public struct ISO18013DataTransferArgs: Sendable {
    public let engagementMethod: ISO18013EngagementMode
    public let retrivalMethod: ISO18013DataTransferMode
    public let request: [
        (docType: String,
         nameSpaces: [String: [String: Bool]],
         isAuthenticated: Bool,
         certificateData: [String: String]?)
    ]?
}

// Available engagement modes
public enum ISO18013EngagementMode : Sendable {
    case qrCode
    case nfc
}

//Available Data Transfer Modes
public enum ISO18013DataTransferMode : Sendable {
    case ble
    case nfc
}

public protocol ISO18013Delegate {
    func onEvent(event: ISO18013Event)
}


public class ISO18013 : @unchecked Sendable {
    
    public static let shared: ISO18013 = ISO18013()
    
    private var isNfcLateEngagement: Bool = false
    private var engagementModes: [ISO18013EngagementMode] = []
    private var retrivalMethods: [ISO18013DataTransferMode] = []
    private var delegate: ISO18013Delegate?
    
    private var nfcDataTransfer: Bool = false
    private var nfcEngagement: Bool = false
    
    //  Start the ISO18013 Library with the specified options
    //
    //  - Parameters:
    //      - trustedCertificates: list of trusted certificates to verify reader validity
    //      - engagementModes: list of engagementModes
    //      - retrivalMethods: list of dataTransferModes
    //      - delegate: Handler for events
    //      - isNfcLateEngagement: Allow the caller to start NFC HCE after entering engagement phase.
    public func start(
        _ trustedCertificates: [[Data]]? = nil,
        engagementModes: [ISO18013EngagementMode],
        retrivalMethods: [ISO18013DataTransferMode],
        delegate: ISO18013Delegate,
        isNfcLateEngagement: Bool) {
            
        self.engagementModes = engagementModes
        self.retrivalMethods = retrivalMethods
        self.delegate = delegate
        self.isNfcLateEngagement = isNfcLateEngagement
        
        _initializeEngagement(trustedCertificates)
    }
    
    //  Set native UI Host Card Emulation Message
    //  - Parameters:
    //      - message: String
    @available(iOS 17.4, *)
    public func setNfcHceMessage(message: String) {
        LibIso18013Proximity.shared.setNfcHceMessage(message: message)
    }
    
    //  Stops the BLE manager and closes connections & Stops NFC HCE emulation
    public func stop() {
        Proximity.shared.stop()
        Task {
            do {
                try await Proximity.shared.stopNfc()
            } catch {
                triggerEvent(.error(error))
            }
        }
    }
    
    // Allow the caller to start NFC HCE after entering engagement phase.
    // Available only if start was with 'isNfcLateEngagement' = true
    public func lateNfcInitialization() throws {
        if engagementModes.first(where: {
            engagementMode in
            if case .nfc = engagementMode {
                return true
            }
            return false
        }) == nil {
            if retrivalMethods.first(where: {
                retrivalMethod in
                if case .nfc = retrivalMethod {
                    return true
                }
                return false
            }) == nil {
                throw ProximityError.nfcFailedToStart
            }
        }
            _initializeNfcEngagement(isLate: false)
        
    }
    
    private func triggerEvent(_ event: ISO18013Event) {
        Task {
            switch(event) {
            case .dataTransferStarted(let request):
                
                if request.engagementMethod == .nfc && request.retrivalMethod != .nfc {
                    print("engagement with nfc, retrival with ble, stopping nfc")
                    try? await Proximity.shared.stopNfc()
                   
                    await try Task.sleep(nanoseconds: 2000000000)
                }
                
                delegate?.onEvent(event: event)
            case .dataTransferStopped:
                let _ = try? await Proximity.shared.stopNfc()
                delegate?.onEvent(event: event)
                
                break
            case .error(_):
                stop()
                delegate?.onEvent(event: event)
            default:
                delegate?.onEvent(event: event)
                break
            }
        }
        
    }
    
    private func handleProximityEvent(_ event: ProximityEvents) {
        switch(event) {
        case .onDocumentRequestReceived(let request):
            triggerEvent(.dataTransferStarted(
                ISO18013DataTransferArgs(
                    engagementMethod: nfcEngagement ? .nfc : .qrCode,
                    retrivalMethod: nfcDataTransfer ? .nfc : .ble, request: request)
            )
            )
            break
        case .onDeviceDisconnected:
            triggerEvent(.dataTransferStopped)
        case .onError(let error):
            triggerEvent(.error(error))
        case .onDeviceConnecting:
            triggerEvent(.bleConnecting)
        case .onDeviceConnected:
            triggerEvent(.bleConnected)
        case .onDocumentPresentationCompleted:
            if nfcDataTransfer {
                triggerEvent(.dataTransferStopped)
            }
        default:
            break
        }
    }
    
    private func handleNfcEvent(_ event: ProximityNfcEvents) {
        switch(event) {
        case .onStart:
            triggerEvent(.nfcStarted)
            nfcDataTransfer = false
            nfcEngagement = false
            break
        case .onStop:
            triggerEvent(.nfcStopped)
            nfcDataTransfer = false
            nfcEngagement = false
            break
        case .onEngagementDone:
            nfcEngagement = true
            triggerEvent(.nfcEngagementDone)
            break
        case .onDataTransferStart:
            nfcDataTransfer = true
            break
        case .onEngagementStart:
            nfcEngagement = true
            triggerEvent(.nfcEngagementStarted)
            break
        case .onEngagementWithDisabledEngagement:
            triggerEvent(.error(ProximityError.nfcEngagementWihtEngagementDisabled))
            break
        default:
            break
        }
    }
    
    private func _initializeEngagement(_ trustedCertificates: [[Data]]? = nil) {
        
        Proximity.shared.proximityHandler = {
            event in
            self.handleProximityEvent(event)
        }
        
        Proximity.shared.nfcHandler = {
            event in
            self.handleNfcEvent(event)
        }
        
        try? Proximity.shared.start(trustedCertificates)
        
        engagementModes.forEach({
            engagementMode in
            switch(engagementMode) {
            case .qrCode:
                _initializeQrCode()
            case .nfc:
                if (!isNfcLateEngagement) {
                    _initializeNfcEngagement(isLate: false)
                }
            }
        })
    }
    
    private func _initializeQrCode() {
        do {
            
            var nfcEngagement = false
            if engagementModes.contains(where: {
                engagementMode in
                if case .nfc = engagementMode {
                    return true
                }
                return false
            }) {
                nfcEngagement = true
            }
            
            
            let qrCode = try Proximity.shared.getQrCode(deviceRetrivalMethods: retrivalMethods, isNfcLateEngagement: isNfcLateEngagement, allowNfcEngagement: nfcEngagement)
            triggerEvent(.qrCode(qrCode))
        } catch {
            triggerEvent(.error(error))
        }
    }
    
    private func _initializeNfcEngagement(isLate: Bool) {
        
        if !isNfcHostCardEmulationSupported() {
            triggerEvent(.error(ProximityError.nfcNotSupported))
            return;
        }
        
        Task {
            do {
                
                var nfcEngagement = false
                if !isLate {
                    if engagementModes.contains(where: {
                        engagementMode in
                        if case .nfc = engagementMode {
                            return true
                        }
                        return false
                    }) {
                        nfcEngagement = true
                    }
                }
                
                if (!nfcEngagement && isLate) {
                    print("no nfc engagement")
                    return
                }
                print(isLate)
                let success = try await Proximity.shared.startNfc(retrivalMethods, isLateNfc: isLate, allowEngagement: nfcEngagement)
                if !success {
                    throw ProximityError.nfcFailedToStart
                }
            } catch {
                triggerEvent(.error(error))
            }
        }
    }
    
}


//ISO18013 Proxy for (now private) Proximity class
extension ISO18013 {
    
    /**
     * Generate DeviceResponse to request for data from the reader.
     *
     * - Parameters:
     *   - items: json of map of [documentType: [nameSpace: [elementIdentifier: allowed]]]
     *   - documents: List of documents.
     *   - sessionTranscript: optional CBOR encoded session transcript
     *
     * - Returns: A CBOR-encoded DeviceResponse object
     */
    public func generateDeviceResponse(items: [String: [String: [String: Bool]]]?,
                                               documents: [ProximityDocument]?,
                                       sessionTranscript: [UInt8]?) throws -> [UInt8] {
        return try Proximity.shared.generateDeviceResponse(items: items, documents: documents, sessionTranscript: sessionTranscript)
    }
    
    //  Responds to a request for data from the reader with deviceResponse.
    //  - Parameters:
    //      - deviceResponse: deviceResponse as cbor encoded
    public func dataPresentation(_ deviceResponse: [UInt8]) throws {
        return try Proximity.shared.dataPresentation(deviceResponse)
    }
    
    //  Responds to a request for data from the reader with error.
    //  - Parameters:
    //      - error: SessionDataStatus
    public func errorPresentation(_ error: SessionDataStatus) throws {
        return try Proximity.shared.errorPresentation(error)
    }
    
    /**
     * Generate DeviceResponse to request for data from the reader.
     *
     * - Parameters:
     *   - items: json of map of [documentType: [nameSpace: [elementIdentifier: allowed]]] as String
     *   - documents: List of documents.
     *   - sessionTranscript: optional CBOR encoded session transcript
     *
     * - Returns: A CBOR-encoded DeviceResponse object
     */
    public func generateDeviceResponseFromJson(items: String?,
                                               documents: [ProximityDocument]?,
                                               sessionTranscript: [UInt8]?) throws -> [UInt8] {
        return try Proximity.shared.generateDeviceResponseFromJson(items: items, documents: documents, sessionTranscript: sessionTranscript)
    }
    
    //  Retrives state of BLE
    //  - Returns: A Bool indicating if BLE is enabled
    public func isBleEnabled() -> Bool {
        Proximity.shared.isBleEnabled()
    }
    
    
    //  Retrives state of NFC HCE
    //  - Returns: A Bool indicating if NFC HLE is supported
    public func isNfcHostCardEmulationSupported() -> Bool {
        if #available(iOS 17.4, *) {
            return CardSession.isSupported
        } else {
            return false
        }
    }
    
    /**
     * Generate session transcript with the OpenID4VPHandover of OpenID4VP 1.0 (Appendix B.2.6.1)
     * This method is used for OpenID4VP flows not using the Digital Credentials API.
     *
     * - Parameters:
     *   - clientId: Authorization Request 'client_id', including its prefix
     *   - responseUri: Authorization Request 'response_uri'
     *   - authorizationRequestNonce: Authorization Request 'nonce'
     *   - jwkThumbprint: JWK SHA-256 Thumbprint (RFC 7638) of the Verifier's key used to encrypt the response, nil when the response is not encrypted
     *
     * - Returns: A CBOR-encoded SessionTranscript object
     */
     public func generateOID4VPSessionTranscriptCBOR(
         clientId: String,
         responseUri: String,
         authorizationRequestNonce: String,
         jwkThumbprint: [UInt8]?
     ) -> [UInt8] {
         return Proximity.shared.generateOID4VPSessionTranscriptCBOR(
            clientId: clientId,
            responseUri: responseUri,
            authorizationRequestNonce: authorizationRequestNonce,
            jwkThumbprint: jwkThumbprint
         )
     }
}

extension ISO18013DataTransferMode {
    internal var  retrivalMethod : DeviceRetrievalMethod {
        switch(self) {
        case .nfc:
            return .nfc(maxLenCommand: UInt64(UInt16.max) - 1, maxLenResponse: UInt64(UInt16.max) - 1)
        case .ble:
            return .ble(isBleServer: true, uuid: DeviceRetrievalMethod.getRandomBleUuid())
        }
    }
}
