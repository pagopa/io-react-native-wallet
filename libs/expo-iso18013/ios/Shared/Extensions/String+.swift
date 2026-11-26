//
//  String+.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

import Foundation

// Extension to add date formatting and base64-url utilities for String
extension String {
    
    // Function to format the string as a POSIX date (either ISO format or MM/DD/YYYY format)
    // - Parameter useIsoFormat: Boolean to indicate whether to use ISO format (default is true)
    // - Returns: The formatted date string or an empty string if the format is invalid
    public func toPosixDate(useIsoFormat: Bool = true) -> String {
        // Split the string at the "T" separator and take the first part (the date)
        guard let dateString = self.split(separator: "T").first else { return "" }
        
        // Return the date in ISO format if specified
        if useIsoFormat {
            return String(dateString)
        }
        
        // Split the date string into components (year, month, day)
        let dateComponents = dateString.split(separator: "-")
        guard dateComponents.count >= 3 else { return "" }
        
        // Return the date in MM/DD/YYYY format
        return "\(dateComponents[1])/\(dateComponents[2])/\(dateComponents[0])"
    }
    
    /// Converts a base64 encoded string to a base64-url encoded string.
    ///
    /// https://tools.ietf.org/html/rfc4648#page-7
    public func base64URLEscaped() -> String {
        return replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }

}

extension String {
    public var hex_decimal: Int {
        return Int(self, radix: 16)!
    }
    
    subscript (bounds: CountableClosedRange<Int>) -> String {
        let start = index(startIndex, offsetBy: bounds.lowerBound)
        let end = index(startIndex, offsetBy: bounds.upperBound)
        return String(self[start...end])
    }
    
    subscript (bounds: CountableRange<Int>) -> String {
        let start = index(startIndex, offsetBy: bounds.lowerBound)
        let end = index(startIndex, offsetBy: bounds.upperBound)
        return String(self[start..<end])
    }
    
    public var byteArray: [UInt8] {
        var res = [UInt8]()
        for offset in stride(from: 0, to: count, by: 2) {
            let byte = self[offset..<offset+2].hex_decimal
            res.append(UInt8(byte))
        }
        return res
    }
    
    public func toBytes() -> [UInt8]? {
        let length = count
        if length & 1 != 0 {
            return nil
        }
        var bytes = [UInt8]()
        bytes.reserveCapacity(length/2)
        var index = startIndex
        for _ in 0..<length/2 {
            let nextIndex = self.index(index, offsetBy: 2)
            if let b = UInt8(self[index..<nextIndex], radix: 16) {
                bytes.append(b)
            } else {
                return nil
            }
            index = nextIndex
        }
        return bytes
    }
}
