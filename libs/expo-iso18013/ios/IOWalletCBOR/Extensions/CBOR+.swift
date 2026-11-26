//
//  CBOR+.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

internal import SwiftCBOR
internal import OrderedCollections

import Foundation

// Extension to make CBOR conform to CustomStringConvertible, providing a custom description for CBOR values
extension CBOR: @retroactive CustomStringConvertible {
    
    // Computed property to provide a string representation of the CBOR object
     var description: String {
        switch self {
                
                // Handle utf8String case, returning the string
            case .utf8String(let str):
                return str
                
                // Handle tagged utf8String case
            case .tagged(let tag, .utf8String(let str)):
                // If the tag corresponds to a date, convert the string to a POSIX date
                if tag.rawValue == 1004 || tag == .standardDateTimeString {
                    return str.toPosixDate()
                }
                return str
                
                // Convert unsigned integers to their string representation
            case .unsignedInt(let integer):
                return String(integer)
                
                // Convert booleans to their string representation
            case .boolean(let boolValue):
                return String(boolValue)
                
                // Convert simple CBOR types to their string representation
            case .simple(let simpleValue):
                return String(simpleValue)
                
                // Default case returns an empty string for unsupported types
            default:
                return ""
        }
    }
}

// Extension to make CBOR conform to CustomDebugStringConvertible, providing a custom debug description for CBOR values
extension CBOR: @retroactive CustomDebugStringConvertible {
    
    // Computed property to provide a detailed debug string representation of the CBOR object
     var debugDescription: String {
        switch self {
                
                // Handle utf8String case, returning the string in single quotes for better readability in debug output
            case .utf8String(let str):
                return "'\(str)'"
                
                // Handle byteString case, returning a debug description with the byte count
            case .byteString(let byteString):
                return "ByteString \(byteString.count)"
                
                // Handle tagged utf8String case, including the tag value in the debug output
            case .tagged(let tag, .utf8String(let str)):
                return "tag \(tag.rawValue) '\(str)'"
                
                // Handle tagged byteString case, including the tag and byte count in the debug output
            case .tagged(let tag, .byteString(let byteString)):
                return "tag \(tag.rawValue) 'ByteString \(byteString.count)'"
                
                // Convert unsigned integers to their string representation
            case .unsignedInt(let integer):
                return String(integer)
                
                // Convert booleans to their string representation
            case .boolean(let boolValue):
                return String(boolValue)
                
                // Provide a debug description for arrays, recursively calling debugDescription on each element
            case .array(let array):
                return "[\(array.reduce("", { $0 + ($0.count > 0 ? "," : "") + " \($1.debugDescription)" }))]"
                
                // Provide a debug description for maps, recursively calling debugDescription on each key-value pair
            case .map(let map):
                return "{\(map.reduce("", { $0 + ($0.count > 0 ? "," : "") + " \($1.key.debugDescription): \($1.value.debugDescription)" }))}"
                
                // Handle null case, returning "Null"
            case .null:
                return "Null"
                
                // Convert simple CBOR types to their string representation
            case .simple(let simpleValue):
                return String(simpleValue)
                
                // Default case for unsupported or unhandled types
            default:
                return "Other"
        }
    }
}

// Extension to add a computed property that determines the MdocDataType from a CBOR value
extension CBOR {
    
    // Computed property to infer the MdocDataType from the CBOR value
     var mdocDataType: MdocDataType? {
        switch self {
                
                // If the CBOR value is a string or null, it's considered a string data type
            case .utf8String(_), .null:
                return .string
                
                // Byte string maps to the bytes data type
            case .byteString(_):
                return .bytes
                
                // Map data corresponds to a dictionary type
            case .map(_):
                return .dictionary
                
                // Array data corresponds to an array type
            case .array(_):
                return .array
                
                // Boolean maps to the boolean data type
            case .boolean(_):
                return .boolean
                
                // Date-related tags map to the date data type
            case .tagged(.standardDateTimeString, _):
                return .date
                
                // Custom tag with raw value 1004 also maps to the date data type
            case .tagged(Tag(rawValue: 1004), _):
                return .date
                
                // Tagged utf8String is considered a string type
            case .tagged(_, .utf8String(_)):
                return .string
                
                // Simple or unsigned integers map to the integer data type
            case .simple(_), .unsignedInt(_):
                return .integer
                
                // Float or double maps to the double data type
            case .float(_), .double(_):
                return .double
                
                // Default case returns nil if no matching data type is found
            default:
                return nil
        }
    }
}

// Extension to add a method that extracts a full date string from a CBOR tagged value
extension CBOR {
    
    // Function to extract the full date string from a CBOR value tagged with a specific tag
     func fullDate() -> String? {
        // Ensure the CBOR value is a tagged value with a tag and an encoded CBOR value
        guard case let CBOR.tagged(tag, cborEncoded) = self,
              tag.rawValue == 1004,                            // Check if the tag matches the custom tag for dates
              case let .utf8String(decodedString) = cborEncoded // Ensure the encoded value is a UTF-8 string
        else {
            return nil
        }
        
        // Return the decoded string if all conditions are met
        return decodedString
    }
}

// Extension to add utility functions for unwrapping and converting CBOR values
extension CBOR {
    
    // Function to unwrap the CBOR value and return its underlying data as a Swift type
     func unwrap() -> Any? {
        switch self {
            case .simple(let value): return value
            case .boolean(let value): return value
            case .byteString(let value): return value
            case .date(let value): return value
            case .double(let value): return value
            case .float(let value): return value
            case .half(let value): return value
            case .tagged(let tag, let cbor): return (tag, cbor) // Return tag and nested CBOR value
            case .array(let array): return array
            case .map(let map): return map
            case .utf8String(let value): return value
            case .negativeInt(let value): return value
            case .unsignedInt(let value): return value
            default: return nil
        }
    }
    
    // Function to attempt to unwrap the CBOR value as UInt64
     func asUInt64() -> UInt64? {
        return self.unwrap() as? UInt64
    }
    
    // Function to attempt to unwrap the CBOR value as Double
     func asDouble() -> Double? {
        return self.unwrap() as? Double
    }
    
    // Function to attempt to unwrap the CBOR value as Int64
     func asInt64() -> Int64? {
        return self.unwrap() as? Int64
    }
    
    // Function to attempt to unwrap the CBOR value as String
     func asString() -> String? {
        return self.unwrap() as? String
    }
    
    // Function to attempt to unwrap the CBOR value as a list of CBOR items (array)
     func asList() -> [CBOR]? {
        return self.unwrap() as? [CBOR]
    }
    
    // Function to attempt to unwrap the CBOR value as a map (OrderedDictionary)
     func asMap() -> OrderedDictionary<CBOR, CBOR>? {
        return self.unwrap() as? OrderedDictionary<CBOR, CBOR>
    }
    
    // Function to attempt to unwrap the CBOR value as an array of UInt8 (bytes)
     func asBytes() -> [UInt8]? {
        return self.unwrap() as? [UInt8]
    }
    
    // Function to encode the CBOR value into Data
     func asData() -> Data {
        return Data(self.encode()) // Encode the CBOR value into Data format
    }
    
    // Static function to handle date strings from CBOR tagged values
     static func asDateString(_ tag: Tag, _ value: CBOR) -> Any {
        if tag.rawValue == 1004 || tag == .standardDateTimeString, let strDate = value.unwrap() as? String {
            return strDate.toPosixDate() // Convert the string to POSIX date format
        } else {
            return value.unwrap() ?? "" // Return the unwrapped value or an empty string
        }
    }
}

/// Methods to cast collections of CBOR types in the form of dictionary/list
extension CBOR {
    
    // Decode a list of CBOR values, optionally unwrapping and converting them to Base64 if specified
     static func decodeList(_ list: [CBOR], unwrap: Bool = true, base64: Bool = false) -> [Any] {
        // Map over the list and decode each CBOR value
        return list.map { val in decodeCborVal(val, unwrap: unwrap, base64: base64) }
    }
    
    // Decode a dictionary of CBOR values, converting the keys to Strings and optionally unwrapping the values
     static func decodeDictionary(
        _ dictionary: OrderedDictionary<CBOR, CBOR>,
        unwrap: Bool = true,
        base64: Bool = false
    ) -> OrderedDictionary<String, Any> {
        var payload = OrderedDictionary<String, Any>()
        for (key, val) in dictionary {
            // Convert CBOR keys to strings and decode the associated CBOR values
            if let keyString = key.asString() {
                payload[keyString] = decodeCborVal(val, unwrap: unwrap, base64: base64)
            }
        }
        return payload
    }
    
    // Decode a single CBOR value, optionally unwrapping nested values and handling Base64 conversion for byte strings
     static func decodeCborVal(_ val: CBOR, unwrap: Bool, base64: Bool) -> Any {
        if unwrap, case .map(let dict) = val {
            // If the CBOR value is a map, recursively decode the dictionary
            return decodeDictionary(dict, unwrap: unwrap)
        } else if unwrap, case .array(let array) = val {
            // If the CBOR value is an array, recursively decode the list
            return decodeList(array, unwrap: unwrap)
        } else if unwrap, case .tagged(let tag, let taggedValue) = val {
            // If the CBOR value is tagged, decode it as a date string or other tagged type
            return CBOR.asDateString(tag, taggedValue)
        } else if unwrap, case .byteString(let bytes) = val {
            // If it's a byte string, optionally encode it in Base64
            return base64 ? Data(bytes).base64EncodedString() : bytes
        } else if unwrap, let unwrappedValue = val.unwrap() {
            // If the value can be unwrapped, return it
            return unwrappedValue
        } else {
            // If no unwrapping is required, return the raw CBOR value
            return val
        }
    }
    
    // Get the typed value from CBOR based on the expected type `T`
     func getTypedValue<T>() -> T? {
        // Special case for DrivingPrivileges type
        if T.self == DrivingPrivileges.self {
            return try? DrivingPrivileges(cbor: self) as? T
        }
        // Handle tagged values such as date strings
        else if case let .tagged(tag, cbor) = self {
            if T.self == String.self, tag.rawValue == 1004 || tag == .standardDateTimeString {
                let strDate = cbor.unwrap() as? String
                return strDate?.toPosixDate() as? T
            }
            return cbor.unwrap() as? T
        }
        // General case: attempt to unwrap the CBOR value and cast it to the expected type
        return self.unwrap() as? T
    }
}

extension CBOR {
   func toCose() -> (CBOR.Tag, [CBOR])? {
    guard let rawCose =  self.unwrap() as? (CBOR.Tag, CBOR),
        let cosePayload = rawCose.1.asList() else {
      return nil
    }
    return (rawCose.0, cosePayload)
  }
  
   func decodeBytestring() -> CBOR? {
    guard let bytestring = self.asBytes(),
        let decoded = try? CBORDecoder(input: bytestring).decodeItem() else {
      return nil
    }
    return decoded
  }
}

extension CBOR {
     func decodeTaggedBytes() -> [UInt8]? {
        guard case let CBOR.tagged(tag, cborEncoded) = self, tag == .encodedCBORDataItem, case let .byteString(bytes) = cborEncoded else {  return nil }
        return bytes
    }
    
    func decodeTagged<T: CBORDecodable>(_ t: T.Type = T.self) -> T? {
        guard case let CBOR.tagged(tag, cborEncoded) = self, tag == .encodedCBORDataItem, case let .byteString(bytes) = cborEncoded else {  return nil }
        return try? .init(data: bytes)
    }
    
     func decodeFullDate() -> String? {
        guard case let CBOR.tagged(tag, cborEncoded) = self, tag.rawValue == 1004, case let .utf8String(s) = cborEncoded else { return nil }
        return s
    }
}
