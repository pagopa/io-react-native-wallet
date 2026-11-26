//
//  Errors.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

// Typealias for representing error items as a dictionary of string descriptions and error codes (UInt64)
public typealias ErrorItems = [String: UInt64]

// Struct to represent a collection of errors, categorized by namespace
 struct Errors {
    
    // Dictionary of namespaces and their associated error items
    public let errors: [String: ErrorItems]
    
    // Subscript to access error items by namespace
    public subscript(nameSpace: String) -> ErrorItems? {
        return errors[nameSpace]
    }
    
    // Initializer for Errors
    // - Parameter errors: A dictionary of namespaces and their associated error items
    public init(errors: [String: ErrorItems]) {
        self.errors = errors
    }
}

// Extension to make Errors conform to CBORDecodable
extension Errors: CBORDecodable {
    
    // Initializes Errors from a CBOR object
    // - Parameter cbor: A CBOR object representing the error data
    public init?(cbor: CBOR) throws {
        // Ensure the CBOR object is a map
        guard case let .map(errors) = cbor else {
            return nil
        }
        
        // Return nil if the map is empty
        if errors.count == 0 {
            return nil
        }
        
        // Decode the CBOR map into a dictionary of namespaces and error items
        let pairs = errors.compactMap { (errorNameSpace: CBOR, errorItemsValue: CBOR) -> (String, ErrorItems)? in
            // Extract namespace as a string
            guard case .utf8String(let nameSpace) = errorNameSpace else {
                return nil
            }
            
            // Extract error items as a map
            guard case .map(let errorItemsMap) = errorItemsValue else {
                return nil
            }
            
            // Decode the error items map into a dictionary
            let errorItems = errorItemsMap.compactMap { (errorItemKey: CBOR, errorItemValue: CBOR) -> (String, UInt64)? in
                // Extract error description as a string
                guard case .utf8String(let errorItemDescription) = errorItemKey else {
                    return nil
                }
                
                // Extract error code as an unsigned integer
                guard case .unsignedInt(let errorItemCode) = errorItemValue else {
                    return nil
                }
                
                // Return the decoded error item
                return (errorItemDescription, errorItemCode)
            }
            
            // Create a dictionary of error items
            let errorItemsDictionary = Dictionary(errorItems, uniquingKeysWith: { (first, _) in first })
            
            // Return nil if no valid error items were found
            if errorItemsDictionary.count == 0 {
                return nil
            }
            
            // Return the namespace and its associated error items
            return (nameSpace, errorItemsDictionary)
        }
        
        // Initialize the errors property with the decoded data
        self.errors = Dictionary(pairs, uniquingKeysWith: { (first, _) in first })
    }
}

// Extension to make Errors conform to CBOREncodable
extension Errors: CBOREncodable {
    
    // Encodes Errors into a CBOR object
    // - Parameter options: Encoding options for CBOR
    // - Returns: A CBOR object representing the encoded errors
    public func toCBOR(options: CBOROptions) -> CBOR {
        // Encode each namespace and its error items into CBOR
        let map1 = errors.map { (nameSpace: String, errorItems: ErrorItems) -> (CBOR, CBOR) in
            let kns = CBOR.utf8String(nameSpace)
            let mei = errorItems.map { (description: String, code: UInt64) -> (CBOR, CBOR) in
                (.utf8String(description), .unsignedInt(code))
            }
            // Return the namespace as a CBOR map
            return (kns, .map(OrderedDictionary(mei, uniquingKeysWith: { (d, _) in d })))
        }
        
        // Create an OrderedDictionary of the encoded namespaces and error items
        let cborMap = OrderedDictionary(map1, uniquingKeysWith: { (ns, _) in ns })
        
        // Return the encoded CBOR map
        return .map(cborMap)
    }
}
