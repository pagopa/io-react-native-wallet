//
//  MdocHelpers.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
import CoreBluetooth
import Combine
import AVFoundation
internal import SwiftCBOR
internal import X509

public typealias RequestItems = [String: [String: [String]]]

class MdocHelpers {
   
    static var errorNoDocumentsDescriptionKey: String { "doctype_not_found" }
    static func getErrorNoDocuments(_ docType: String) -> Error { NSError(domain: "\(MdocBleServer.self)", code: 0, userInfo: ["key": Self.errorNoDocumentsDescriptionKey, "%s": docType]) }
 
    public static func getSessionDataToSend(sessionEncryption: SessionEncryption?, status: TransferStatus, docToSend: DeviceResponse, errorStatus: UInt64 = 11) -> Result<Data, Error> {
        do {
            guard var sessionEncryption else {
                return .failure(ErrorHandler.sessionEncryptionNotInitialized)
            }
            if docToSend.documents == nil {
                //logger.error("Could not create documents to send")
            }
            let cborToSend = docToSend.toCBOR(options: CBOROptions())
            let clearBytesToSend = cborToSend.encode()
            let cipherData = try sessionEncryption.encrypt(clearBytesToSend)
            let sd = SessionData(cipher_data: status == .error ? nil : cipherData, status: status == .error ? errorStatus : 20)
            return .success(Data(sd.encode(options: CBOROptions())))
        } catch { return .failure(error) }
    }
    
    /// Decrypt the contents of a data object and return a ``DeviceRequest`` object if the data represents a valid device request. If the data does not represent a valid device request, the function returns nil.
    /// - Parameters:
    ///   - deviceEngagement: deviceEngagement
    ///   - docs: IssuerSigned documents
    ///   - iaca: Root certificates trusted
    ///   - devicePrivateKeys: Device private keys
    ///   - dauthMethod: Method to perform mdoc authentication
    ///   - handOver: handOver structure
    /// - Returns: A ``DeviceRequest`` object
    
    static func decodeRequestAndInformUser(deviceEngagement: DeviceEngagement?, docs: [String: IssuerSigned], iaca: [[SecCertificate]], requestData: Data, devicePrivateKeys: [String: CoseKeyPrivate], dauthMethod: DeviceAuthMethod, readerKeyRawData: [UInt8]?, handOver: CBOR) -> Result<(sessionEncryption: SessionEncryption, deviceRequest: DeviceRequest, params: [String: Any], isValidRequest: Bool), Error> {
        do {
            guard let seCbor = try CBOR.decode([UInt8](requestData)) else {
                //Request Data is not Cbor
                return .failure(ErrorHandler.requestDecodeError)
            }
            guard var se = try SessionEstablishment(cbor: seCbor) else {
                //Request Data cannot be decoded to session establisment
                return .failure(ErrorHandler.requestDecodeError)
            }
            if se.eReaderKeyRawData == nil,
               let readerKeyRawData {
                se.eReaderKeyRawData = readerKeyRawData
            }
            
            guard se.eReaderKey != nil else {
                //Reader key not available
                return .failure(ErrorHandler.readerKeyMissing)
            }
            let requestCipherData = se.data
            guard let deviceEngagement else {
                //Device Engagement not initialized
                return .failure(ErrorHandler.deviceEngagementMissing)
            }
            // init session-encryption object from session establish message and device engagement, decrypt data
            let sessionEncryption = SessionEncryption(se: se, de: deviceEngagement, handOver: handOver)
            guard var sessionEncryption else {
                //Session Encryption not initialized
                return .failure(ErrorHandler.sessionEncryptionNotInitialized)
            }
            guard let requestData = try sessionEncryption.decrypt(requestCipherData) else {
                //Request data cannot be decrypted
                return .failure(ErrorHandler.requestDecodeError)
            }
            guard let deviceRequest = try DeviceRequest(data: requestData) else {
                //Decrypted data cannot be decoded
                return .failure(ErrorHandler.requestDecodeError)
            }
            guard let (drTest, validRequestItems, errorRequestItems) = try Self.getDeviceResponseToSend(deviceRequest: deviceRequest, issuerSigned: docs, selectedItems: nil, sessionEncryption: sessionEncryption, eReaderKey: sessionEncryption.sessionKeys.publicKey, devicePrivateKeys: devicePrivateKeys, dauthMethod: dauthMethod) else {
                //Valid request items nil
                return .failure(ErrorHandler.requestDecodeError)
            }
            let bInvalidReq = (drTest.documents == nil)
            var params: [String: Any] = [UserRequestKeys.valid_items_requested.rawValue: validRequestItems, UserRequestKeys.error_items_requested.rawValue: errorRequestItems]
            if let docR = deviceRequest.docRequests.first {
                let mdocAuth = MdocReaderAuthentication(transcript: sessionEncryption.transcript)
                if let readerAuthRawCBOR = docR.readerAuthRawCBOR,
                   let certData = docR.readerCertificate,
                   let x509 = try? X509.Certificate(derEncoded: [UInt8](certData)),
                   let (b, isValidCertificateChain, reasonFailure) = try? mdocAuth.validateReaderAuth(readerAuthCBOR: readerAuthRawCBOR, readerAuthCertificate: certData, itemsRequestRawData: docR.itemsRequestRawData!, readerAuthCertificateChain: docR.readerCertificateChain, rootCerts: iaca) {
                    params[UserRequestKeys.reader_certificate_issuer.rawValue] = MdocHelpers.getCN(from: x509.subject.description)
                    params[UserRequestKeys.reader_auth_validated.rawValue] = b
                    if let reasonFailure {
                        params[UserRequestKeys.reader_certificate_validation_message.rawValue] = reasonFailure
                    }
                }
            }
            return .success((sessionEncryption: sessionEncryption, deviceRequest: deviceRequest, params: params, isValidRequest: !bInvalidReq))
        } catch { return .failure(error) }
    }
    
    /// Construct ``DeviceResponse`` object to present from wallet data and input device request
    /// - Parameters:
    ///   - deviceRequest: Device request coming from verifier
    ///   - issuerSigned: Map of document ID to issuerSigned cbor data
    ///   - selectedItems: Selected items from user (Map of Document ID to namespaced items)
    ///   - sessionEncryption: Session Encryption data structure
    ///   - eReaderKey: eReader (verifier) ephemeral public key
    ///   - devicePrivateKeys: Device Private keys
    ///   - sessionTranscript: Session Transcript object
    ///   - dauthMethod: Mdoc Authentication method
    /// - Returns: (Device response object, valid requested items, error request items) tuple
    static func getDeviceResponseToSend(deviceRequest: DeviceRequest?, issuerSigned: [String: IssuerSigned], selectedItems: RequestItems? = nil, sessionEncryption: SessionEncryption? = nil, eReaderKey: CoseKey? = nil, devicePrivateKeys: [String: CoseKeyPrivate], sessionTranscript: SessionTranscript? = nil, dauthMethod: DeviceAuthMethod) throws -> (response: DeviceResponse, validRequestItems: RequestItems, errorRequestItems: RequestItems)? {
        var docFiltered = [Document]();
        var docErrors = [[String: UInt64]]()
        
        
        var validReqItemsDocDict = RequestItems(); var errorReqItemsDocDict = RequestItems()
        guard deviceRequest != nil || selectedItems != nil else { fatalError("Invalid call") }
        let haveSelectedItems = selectedItems != nil
        // doc.id's (if have selected items), otherwise doc.types
        let reqDocIdsOrDocTypes = if haveSelectedItems { Array(selectedItems!.keys) } else { deviceRequest!.docRequests.map(\.itemsRequest.docType) }
        for reqDocIdOrDocType in reqDocIdsOrDocTypes {
            var docReq: DocRequest? // if selected items is null
            if haveSelectedItems == false {
                docReq = deviceRequest?.docRequests.findDoc(name: reqDocIdOrDocType)
                guard let (doc, _) = Array(issuerSigned.values).findDoc(name: reqDocIdOrDocType) else {
                    docErrors.append([reqDocIdOrDocType: UInt64(0)])
                    errorReqItemsDocDict[reqDocIdOrDocType] = [:]
                    continue
                }
            } else {
                guard issuerSigned[reqDocIdOrDocType] != nil else { continue }
            }
            let devicePrivateKey = devicePrivateKeys[reqDocIdOrDocType] ?? CoseKeyPrivate(crv: .p256) // used only if doc.id
            let doc = if haveSelectedItems { issuerSigned[reqDocIdOrDocType]! } else { Array(issuerSigned.values).findDoc(name: reqDocIdOrDocType)!.0 }
            // Document's data must be in CBOR bytes that has the IssuerSigned structure according to ISO 23220-4
            // Currently, the library does not support IssuerSigned structure without the nameSpaces field.
            guard let issuerNs = doc.issuerNameSpaces else {
                //Document does not contain issuer namespaces
                return nil
            }
            var nsItemsToAdd = [String: [IssuerSignedItem]]()
            var nsErrorsToAdd = [String: ErrorItems]()
            var validReqItemsNsDict = [String: [String]]()
            // for each request namespace
            let reqNamespaces = if haveSelectedItems { Array(selectedItems![reqDocIdOrDocType]!.keys)} else {  Array(docReq!.itemsRequest.requestNameSpaces.nameSpaces.keys) }
            for reqNamespace in reqNamespaces {
                let reqElementIdentifiers = if haveSelectedItems { Array(selectedItems![reqDocIdOrDocType]![reqNamespace]!)} else { docReq!.itemsRequest.requestNameSpaces.nameSpaces[reqNamespace]!.elementIdentifiers }
                guard let items = issuerNs[reqNamespace] else {
                    nsErrorsToAdd[reqNamespace] = Dictionary(grouping: reqElementIdentifiers, by: {$0}).mapValues { _ in 0 }
                    continue
                }
                var itemsReqSet = Set(reqElementIdentifiers)
                
                //MARK: CHECK THIS LATER
                
                //                if haveSelectedItems == false {
                //                    itemsReqSet = itemsReqSet.subtracting(IsoMdlModel.self.moreThan2AgeOverElementIdentifiers(reqDocIdOrDocType, reqNamespace, SimpleAgeAttest(namespaces: issuerNs.nameSpaces), reqElementIdentifiers))
                //                }
                
                let itemsSet = Set(items.map({$0.elementIdentifier}))
                var itemsToAdd = items.filter({ itemsReqSet.contains($0.elementIdentifier) })
                if let selectedItems {
                    let selectedNsItems = selectedItems[reqDocIdOrDocType]?[reqNamespace] ?? []
                    itemsToAdd = itemsToAdd.filter({ selectedNsItems.contains($0.elementIdentifier) })
                }
                if itemsToAdd.count > 0 {
                    nsItemsToAdd[reqNamespace] = itemsToAdd
                    validReqItemsNsDict[reqNamespace] = itemsToAdd.map({$0.elementIdentifier})
                }
                let errorItemsSet = itemsReqSet.subtracting(itemsSet)
                if errorItemsSet.count > 0 {
                    nsErrorsToAdd[reqNamespace] = Dictionary(grouping: errorItemsSet, by: { $0 }).mapValues { _ in 0 }
                }
            } // end ns for
            let errors: Errors? = nsErrorsToAdd.count == 0 ? nil : Errors(errors: nsErrorsToAdd)
            if nsItemsToAdd.count > 0 {
                let issuerAuthToAdd = doc.issuerAuth
                let issToAdd = IssuerSigned(issuerNameSpaces: IssuerNameSpaces(nameSpaces: nsItemsToAdd), issuerAuth: issuerAuthToAdd)
                var devSignedToAdd: DeviceSigned? = nil
                let sessionTranscript = sessionEncryption?.transcript ?? sessionTranscript
                if let eReaderKey, let sessionTranscript {
                    let authKeys = CoseKeyExchange(publicKey: eReaderKey, privateKey: devicePrivateKey)
                    let mdocAuth = MdocAuthentication(transcript: sessionTranscript, authKeys: authKeys)
                    guard let devAuth = try mdocAuth.getDeviceAuthForTransfer(docType: doc.issuerAuth!.mobileSecurityObject.docType, dauthMethod: dauthMethod) else {
                        //Cannot create device auth
                        return nil
                    }
                    devSignedToAdd = DeviceSigned(deviceAuth: devAuth)
                }
                let docToAdd = Document(docType: doc.issuerAuth!.mobileSecurityObject.docType, issuerSigned: issToAdd, deviceSigned: devSignedToAdd, errors: errors)
                docFiltered.append(docToAdd)
                validReqItemsDocDict[doc.issuerAuth!.mobileSecurityObject.docType] = validReqItemsNsDict
            } else {
                docErrors.append([doc.issuerAuth!.mobileSecurityObject.docType: UInt64(0)])
            }
            errorReqItemsDocDict[doc.issuerAuth!.mobileSecurityObject.docType] = nsErrorsToAdd.mapValues { Array($0.keys) }
        } // end doc for
        let documentErrors: [DocumentError]? = docErrors.count == 0 ? nil : docErrors.map({
            e in
            
            DocumentError.init(documentErrors:e)
        }
        )
        let documentsToAdd = docFiltered.count == 0 ? nil : docFiltered
        let deviceResponseToSend = DeviceResponse(version: DeviceResponse.defaultVersion, documents: documentsToAdd, documentErrors: documentErrors, status: 0)
        return (deviceResponseToSend, validReqItemsDocDict, errorReqItemsDocDict)
    }
    
    /// Returns the number of blocks that dataLength bytes of data can be split into, given a maximum block size of maxBlockSize bytes.
    /// - Parameters:
    ///   - dataLength: Length of data to be split
    ///   - maxBlockSize: The maximum block size
    /// - Returns: Number of blocks
    public static func CountNumBlocks(dataLength: Int, maxBlockSize: Int) -> Int {
        let blockSize = maxBlockSize
        var numBlocks = 0
        if dataLength > maxBlockSize {
            numBlocks = dataLength / blockSize;
            if numBlocks * blockSize < dataLength {
                numBlocks += 1
            }
        } else if dataLength > 0 {
            numBlocks = 1
        }
        return numBlocks
    }
    
    /// Creates a block for a given block id from a data object. The block size is limited to maxBlockSize bytes.
    /// - Parameters:
    ///   - data: The data object to be sent
    ///   - blockId: The id (number) of the block to be sent
    ///   - maxBlockSize: The maximum block size
    /// - Returns: (chunk:The data block, bEnd: True if this is the last block, false otherwise)
    public static func CreateBlockCommand(data: Data, blockId: Int, maxBlockSize: Int) -> (Data, Bool) {
        let start = blockId * maxBlockSize
        var end = (blockId+1) * maxBlockSize
        var bEnd = false
        if end >= data.count {
            end = data.count
            bEnd = true
        }
        let chunk = data.subdata(in: start..<end)
        return (chunk,bEnd)
    }
        
    /// Check if BLE access is allowed and return success or failure
    /// - Parameters:
    ///   - completion: The completion handler with a result indicating success or failure
    public static func checkBleAccess(completion: @escaping (Result<Void, Error>) -> Void) {
        
        let authorization: CBManagerAuthorization
        
        
        if #available(iOS 13.1, *) {
            authorization = CBManager.authorization
        }
        else {
            authorization = .notDetermined
        }
        
        
            switch authorization {
                case .denied:
                    // BLE access is denied, return a failure
                    let error = NSError(domain: "BLEAccess", code: 1, userInfo: [NSLocalizedDescriptionKey: NSLocalizedString("Bluetooth access is denied", comment: "")])
                    completion(.failure(error))
                case .restricted:
                    // BLE access is restricted
                    let error = NSError(domain: "BLEAccess", code: 2, userInfo: [NSLocalizedDescriptionKey: NSLocalizedString("Bluetooth access is restricted", comment: "")])
                    completion(.failure(error))
                case .allowedAlways:
                    completion(.success(()))
                case .notDetermined:
                    // Authorization is not determined, request access
                    CBCentralManager(delegate: BLEAccessDelegate { granted in
                        completion(granted)
                    }, queue: nil)
                @unknown default:
                    // Unknown authorization status, handle gracefully
                    let error = NSError(domain: "BLEAccess", code: 3, userInfo: [NSLocalizedDescriptionKey: NSLocalizedString("Unknown Bluetooth authorization status", comment: "")])
                    completion(.failure(error))
            }
    }

    
    /// Checks if the user has granted permission to access the camera
    /// - Parameters:
    ///   - completion: A closure that returns success or failure based on the camera access status
    public static func checkCameraAccess(completion: @escaping (Result<Void, Error>) -> Void) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
            case .denied:
                completion(.failure(NSError(domain: "CameraAccess", code: 1, userInfo: [NSLocalizedDescriptionKey: "Camera access is denied"])))
            case .restricted:
                completion(.failure(NSError(domain: "CameraAccess", code: 2, userInfo: [NSLocalizedDescriptionKey: "Camera access is restricted"])))
            case .authorized:
                completion(.success(()))
            case .notDetermined:
                AVCaptureDevice.requestAccess(for: .video) { success in
                    if success {
                        completion(.success(()))
                    } else {
                        completion(.failure(NSError(domain: "CameraAccess", code: 3, userInfo: [NSLocalizedDescriptionKey: "Camera access was not granted"])))
                    }
                }
            @unknown default:
                completion(.failure(NSError(domain: "CameraAccess", code: 4, userInfo: [NSLocalizedDescriptionKey: "Unknown camera authorization status"])))
        }
    }
    
    /// Get the common name (CN) from the certificate distringuished name (DN)
    public static func getCN(from dn: String) -> String  {
        let regex = try! NSRegularExpression(pattern: "CN=([^,]+)")
        if let match = regex.firstMatch(in: dn, range: NSRange(location: 0, length: dn.count)) {
            if let r = Range(match.range(at: 1), in: dn) {
                return String(dn[r])
            }
        }
        return dn
    }
}

private class BLEAccessDelegate: NSObject, CBCentralManagerDelegate {
    private let completion: (Result<Void, Error>) -> Void
    
    init(completion: @escaping (Result<Void, Error>) -> Void) {
        self.completion = completion
        super.init()
    }
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
            case .poweredOn:
                completion(.success(()))
            default:
                let error = NSError(domain: "BLEAccess", code: 4, userInfo: [NSLocalizedDescriptionKey: NSLocalizedString("Bluetooth access was not granted", comment: "")])
                completion(.failure(error))
        }
    }
}
