//
//  NFCCardEmulator.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 04/12/25.
//

import CoreNFC

@available(iOS 17.4, *)
class NFCCardEmulator : @unchecked Sendable {
    var delegate: NFCCardEmulatorDelegate
    
    init(delegate: NFCCardEmulatorDelegate) {
        self.delegate = delegate
    }
    
    func setMessage(message: String) {
        cardSession?.alertMessage = message
    }
    
    private func processAPDU(_ cardSession: CardSession, _ capdu: Data) async -> Data {
        if let apduRequest = APDURequest(apdu: [UInt8](capdu)) {
            
            print(apduRequest)
            print(apduRequest.debugDescription)
            
            
            let apduResponse = await delegate.processAPDU(cardSession, apduRequest)
            
            
            print(apduResponse)
            
            return Data(apduResponse.raw)
            
        }
        
        let apduResponse = APDUResponse([], .fileNotFound, extended: false)
        
        return Data(apduResponse.raw)
    }
    
    var cardSession: CardSession?
    var presentmentIntent: NFCPresentmentIntentAssertion?
    
    func stop() async throws {
        print(cardSession)
        
        // Only delay and stop if there is an active card session.
        guard let activeSession = self.cardSession else {
            // Nothing to stop; clear any presentment intent without delaying.
            self.presentmentIntent = nil
            return
        }
        
        await try Task.sleep(for: .seconds(3))
    
        await activeSession.stopEmulation(status: .success)
        activeSession.invalidate()
        self.cardSession = nil
        self.presentmentIntent = nil
        
    }
    
    deinit {
        print("deinit card emulator")
        self.cardSession?.invalidate()
        self.cardSession = nil
        self.presentmentIntent = nil
    }
    
    func start() async throws -> Bool {
        // Proceed only if the current device and system are able and
        // eligible to use CardSession.
        guard NFCReaderSession.readingAvailable,
              CardSession.isSupported,
              await CardSession.isEligible else {
            return false
        }
        
        var presentmentIntent: NFCPresentmentIntentAssertion?
        
        let cardSession: CardSession
        
        do {
            cardSession = try await CardSession()
            
            try await cardSession.startEmulation()
            
        } catch {
            print("CardSession() error: \(error)")
            /// Handle failure to acquire NFC presentment intent assertion or
            /// card session.
            return false
        }
        
        self.cardSession = cardSession
        self.presentmentIntent = presentmentIntent
        
        
        
        Task {
            
            // Iterate over events as the card session produces them.
            for try await event in cardSession.eventStream {
                delegate.emulationStatusChanged(event)
                
                switch event {
                case .sessionStarted:
                    //try await cardSession.startEmulation()
                    break
                    
                case .readerDetected:
                    if await !cardSession.isEmulationInProgress {
                        /// Start card emulation on first detection of an external reader.
                        try await cardSession.startEmulation()
                    }
                    break
                    
                case .readerDeselected:
                    //stopping emulation here can be buggy with some readers
                    break
                    
                case .received(let cardAPDU):
                    
                    do {
                        let responseAPDU = await processAPDU(cardSession, cardAPDU.payload)
                        try await handleResponse(cardAPDU: cardAPDU, responseAPDU: responseAPDU)
                    }
                    catch {
                        print(error)
                        throw error
                    }
                    
                    
                    
                case .sessionInvalidated(reason: _):
                    //cardSession.alertMessage = String(localized: "Ending communication with card reader.")
                    /// Handle the reason for session invalidation.
                    await cardSession.stopEmulation(status: .success)
                    break
                @unknown default:
                    print("unknown event")
                }
            }
            
            presentmentIntent = nil /// Release presentment intent assertion.
        }
        
        
        
        return true
    }
    
    private func handleResponse(cardAPDU: CardSession.APDU, responseAPDU: Data, _ counter: Int = 0) async throws {
        if counter > 10 {
            throw CardSession.Error.transmissionError
        }
        
        do {
            /// Call handler to process received input and produce a response.
            try await cardAPDU.respond(response: responseAPDU)
        } catch {
            print(error)
            
            if let cardError = error as? CardSession.Error {
                switch(cardError) {
                case .transmissionError:
                    return try await handleResponse(cardAPDU: cardAPDU, responseAPDU: responseAPDU, counter + 1)
                default:
                    break
                }
            }
            
            throw error
        }
    }
    
}

@available(iOS 17.4, *)
protocol NFCCardEmulatorDelegate : Sendable {
    func processAPDU(_ cardSession: CardSession, _ apduRequest: APDURequest) async -> APDUResponse
    func emulationStatusChanged(_ event: CardSession.Event)
}
