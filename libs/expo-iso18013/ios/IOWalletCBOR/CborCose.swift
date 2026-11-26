//
//  CborCose.swift
//  cbor
//
//  Created by Antonio on 02/12/24.
//



internal import SwiftCBOR
internal import OrderedCollections
import CryptoKit
import Foundation

public class CborCose {
    
    //  Sign data using provided privateKey
    //  - Parameters:
    //      - data: Data to sign
    //      - privateKey: IOWalletCBORCoseKeyPrivate instance representing the private key choosen to sign data
    //  - Returns: COSE-Sign1 structure with payload data included encoded as Data
    public static func sign(data: Data, privateKey: IOWalletCBORCoseKeyPrivate) -> Data {
        let cose = try! Cose.makeCoseSign1(payloadData: data, deviceKey: privateKey.coseKeyPrivate, alg: .es256)
        
        return Data(cose.encode(options: CBOROptions()))
    }
    
    //  Verify data using provided publicKey
    //  - Parameters:
    //      - data: Encoded COSE-Sign1 structure to verify
    //      - publicKey: IOWalletCBORCoseKey instance representing the public key choosen to verify data
    public static func verify(data: Data, publicKey: IOWalletCBORCoseKey) -> Bool {
        let coseCBOR = try? CBOR.decode(data.bytes)
        
        let cose = Cose.init(type: .sign1, cbor: coseCBOR!)!
        
        return (try? cose.validateCoseSign1(publicKey_x963: publicKey.getx963Representation())) ?? false
    }
    
    //  Create a secure private key
    //  - Parameters:
    //      - curve: Elliptic Curve Name
    //      - forceSecureEnclave: A boolean indicating if secure enclave must be used
    //  - Returns: A IOWalletCBORCoseKeyPrivate object if creation succeeds
    public static func createSecurePrivateKey(curve: ECCurveName = .p256, forceSecureEnclave: Bool = true) -> IOWalletCBORCoseKeyPrivate? {
        if forceSecureEnclave {
            if !SecureEnclave.isAvailable {
                //throw Error(description: "secureEnclaveNotSupported")
                return nil
            }
            
            if curve != .p256 {
                return nil
                //throw ErrorHandler.secureEnclaveNotSupportedAlgorithm(algorithm: curve)
            }
        }
        
        if SecureEnclave.isAvailable && curve == .p256 {
            guard let se256 = try? SecureEnclave.P256.KeyAgreement.PrivateKey() else {
                return nil
            }
            
            return IOWalletCBORCoseKeyPrivate(CoseKeyPrivate(
                publicKeyx963Data: se256.publicKey.x963Representation,
                secureEnclaveKeyID: se256.dataRepresentation))
        }
        
        //if force is disabled and secure enclave is not available use normal key generation
        return IOWalletCBORCoseKeyPrivate(CoseKeyPrivate(crv: curve))
    }
    
    //  Decode CBOR encoded documents (or document) to json object string
    //  - Parameters:
    //      - data: CBOR encoded data to decode
    //  - Returns: String encoded json object
    public static func documentsCborToJson(data: Data) -> String? {
        return decodeCBOR(data: data, true, true, true)
    }
    
    
    //  Decode CBOR encoded issuerSigned to json object string
    //  - Parameters:
    //      - data: CBOR encoded data to decode
    //  - Returns: String encoded json object
    public static func issuerSignedCborToJson(data: Data) -> String? {
        return decodeCBOR(data: data, false, true, true)
    }
    
    
    
    //  Decode CBOR encoded data to json object string
    //  - Parameters:
    //      - data: CBOR encoded data to decode
    //      - documents: wrap decoded object in a "documents" array (Optional and set as true to mimic android)
    //      - properIssuerItem: Se as true to to have "elementIdentifier" and "elementValue" as keys instead of "key": "value" in issuerItem json object.
    //  - Returns: String encoded json object
    public static func decodeCBOR(data: Data, _ documents: Bool = true, _ properIssuerItem: Bool = true, _ decodeIssuerAuth: Bool = true) -> String? {
        guard let cborObject = try? CBOR.decode(data.bytes) else {
            return nil
        }
        
        guard let jsonObject = cborToJson(cborObject: cborObject, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth) else {
            return nil
        }
        
        let data: Data
        
        if documents {
            
            var docs = jsonObject
            
            if let map = jsonObject as? [AnyHashable?: AnyHashable?] {
                if (!map.keys.contains(where: {$0 as? String == "documents"})) {
                    docs = ["documents": [docs]]
                }
            }
            
            guard let jsonData = try? JSONSerialization.data(withJSONObject: docs, options: []) else {
                return nil
            }
            
            data = jsonData
        }
        else {
            guard let jsonData = try? JSONSerialization.data(withJSONObject: jsonObject, options: []) else {
                return nil
            }
            
            data = jsonData
        }
        
        return String(data: data, encoding: String.Encoding.utf8)
    }
    
    
    //  Decode CBOR encoded data to json object
    //  - Parameters:
    //      - data: CBOR encoded data to decode
    //  - Returns: JSON Object
    public static func jsonFromCBOR(data: Data) -> Any? {
        guard let cborObject = try? CBOR.decode(data.bytes) else {
            return nil
        }
        
        guard let jsonObject = cborToJson(cborObject: cborObject, properIssuerItem: true, decodeIssuerAuth: true) else {
            return nil
        }
        
        guard let jsonData = try? JSONSerialization.data(withJSONObject: jsonObject, options: []) else {
            return nil
        }
        
        return try? JSONSerialization.jsonObject(with: jsonData)
    }
    
    
    private static func issuerItemToJson(itemMap: OrderedDictionary<CBOR, CBOR>, _ properIssuerItem: Bool, _ decodeIssuerAuth: Bool) -> [AnyHashable?: AnyHashable?]? {
        if let elementIdentifier = itemMap[CBOR.utf8String("elementIdentifier")],
           let elementValue = itemMap[CBOR.utf8String("elementValue")],
           let digestID = itemMap[CBOR.utf8String("digestID")],
           let random =  itemMap[CBOR.utf8String("random")] {
            
            if (properIssuerItem) {
                return [
                    "digestID": cborToJson(cborObject: digestID, isKey: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth) ,
                    "random": cborToJson(cborObject: random, isKey: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth) ,
                    "elementIdentifier": cborToJson(cborObject: elementIdentifier, isKey: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth),
                    "elementValue": cborToJson(cborObject: elementValue, isKey: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth)
                ]
            }
            else {
                return [
                    "digestID": cborToJson(cborObject: digestID, isKey: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth) ,
                    "random": cborToJson(cborObject: random, isKey: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth) ,
                    cborToJson(cborObject: elementIdentifier, isKey: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth) : cborToJson(cborObject: elementValue, isKey: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth)
                ]
            }
            
            
        }
        return nil
    }
    
    private static func decodeUnprotectedHeaders(issuerAuthCose: Cose, _ properIssuerItem: Bool) -> AnyHashable? {
        let val = issuerAuthCose.unprotectedHeader?.rawHeader?.asMap()?.map({
            keyPair in
            
            let keyStr: String
            var value: AnyHashable? = cborToJson(cborObject: keyPair.value, isKey: false, properIssuerItem: properIssuerItem, decodeIssuerAuth: true)
            
            if let key = keyPair.key.asUInt64(),
               let header = Cose.CoseHeader.Headers(rawValue: Int(key)) {
                keyStr = "\(header)"
                
                switch(header) {
                    case .x5chain, .x5bag:
                        //if header is x5chain or x5bag and value is not array transform it to array
                        if !(value is [AnyHashable?]) {
                            value = [value]
                        }
                        break
                    default:
                        break
                }
            } else {
                //when header is not in the enum map it as the int value
                if let keyValue = cborToJson(cborObject: keyPair.key, isKey: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: true)  {
                    keyStr = "\(keyValue)"
                } else {
                    keyStr = "\(keyPair.key)"
                }
            }
            return Dictionary<String, AnyHashable?>.Element(
                keyStr, value
            )
        })
        
        if let val = val {
            let dictionary = Dictionary(uniqueKeysWithValues: val)
            
            return dictionary
        }
        
        
        return nil
        
    }
    
    private static func decodeIssuerAuthValue(_ issuerAuthValue: CBOR?, _ properIssuerItem: Bool) -> AnyHashable? {
        if let issuerAuthValue = issuerAuthValue,
           let issuerAuthCose = Cose.init(type: .sign1, cbor: issuerAuthValue),
           let issuerAuthPayload = issuerAuthCose.payload.asBytes() {
            
            
            
            return AnyHashable([
                "protectedHeader": cborToJson(cborObject: issuerAuthCose.protectedHeader.rawHeader, isKey: false, properIssuerItem: properIssuerItem, decodeIssuerAuth: true),
                "unprotectedHeader": decodeUnprotectedHeaders(issuerAuthCose: issuerAuthCose, properIssuerItem),
                "signature": issuerAuthCose.signature.base64UrlEncodedString(),
                "payload": cborToJson(cborObject: try? CBOR.decode(issuerAuthPayload), isKey: false, properIssuerItem: properIssuerItem, decodeIssuerAuth: true),
                "rawValue": Data(issuerAuthValue.encode()).base64UrlEncodedString()
            ])
        }
        return nil
    }
    
    private static func cborToJson(cborObject: CBOR?,
                                   isKey: Bool = false,
                                   isCBOR: Bool = false,
                                   properIssuerItem: Bool,
                                   decodeIssuerAuth: Bool) -> AnyHashable? {
        
        switch(cborObject) {
            case .map(let cborMap):
                var map: [AnyHashable?: AnyHashable?] = [:]
                
                if let issuerItem = issuerItemToJson(itemMap: cborMap, properIssuerItem, decodeIssuerAuth) {
                    map = issuerItem
                }
                else {
                    
                    cborMap.keys.forEach({
                        key in
                        
                        let keyStr = cborToJson(cborObject: key, isKey: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth) as? String
                        
                        
                        //handle issuerAuth decoding
                        if keyStr == "issuerAuth",
                           decodeIssuerAuth,
                           let issuerAuth = decodeIssuerAuthValue(cborMap[key], properIssuerItem) {
                            map[keyStr] = issuerAuth
                            return
                        }
                        
                        if keyStr == "deviceKey",
                           decodeIssuerAuth,
                           let coseKeyValue = cborMap[key],
                           let coseKey = CoseKey(cbor: coseKeyValue),
                           let coseKeyJwk = coseKey.toJWKObj()
                        {
                            map[keyStr] = AnyHashable(coseKeyJwk)
                            return
                        }
                        
                        if keyStr == "issuerAuth" || keyStr == "deviceSignature",
                           let bytes = cborMap[key]?.encode() {
                            
                            map[keyStr] = Data(bytes).base64UrlEncodedString()
                            return
                            
                        }
                        
                        map[keyStr] = cborToJson(cborObject: cborMap[key],
                                                 isKey: isKey, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth)
                        
                    })
                }
                return map as AnyHashable
                
            case .array(let cborArray):
                var array: [AnyHashable?] = []
                array = cborArray.map({
                    value in
                    cborToJson(cborObject: value, isKey: isKey, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth)
                })
                return array as AnyHashable
                
            case .byteString(let bytes):
                if isCBOR, let cbor = try? CBOR.decode(bytes) {
                    return cborToJson(cborObject: cbor, isKey: isKey, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth)
                }
                return Data(bytes).base64UrlEncodedString()
                
            case .tagged(let tag, let cbor):
                if tag == .encodedCBORDataItem {
                    return cborToJson(cborObject: cbor, isKey: isKey, isCBOR: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth)
                }
                if tag == .fullDateItem {
                    return cborToJson(cborObject: cbor, isKey: isKey, isCBOR: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth)
                }
                if tag == .standardDateTimeString {
                    return cborToJson(cborObject: cbor, isKey: isKey, isCBOR: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth)
                }
                if tag == .base64Url {
                    return cborToJson(cborObject: cbor, isKey: isKey, isCBOR: true, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth)
                }
                return [
                    "\(tag.rawValue)" : cborToJson(cborObject: cbor, isKey: isKey, isCBOR: false, properIssuerItem: properIssuerItem, decodeIssuerAuth: decodeIssuerAuth)
                ]
                
            case .unsignedInt(let value):
                if (isKey) {
                    return "\(value)"
                }
                return value
            case .negativeInt(let value):
                let realValue = Int64(bitPattern: ~value)
                
                if isKey {
                    return "\(realValue)"
                }
                return (realValue)
            case .boolean(let value):
                return value
            default:
                if isKey {
                    return "\(cborObject!.unwrap()!)"
                }
                else {
                    return cborObject?.unwrap() as? AnyHashable
                }
        }
        
    }
}
