//
//  Data+.swift
//  libIso18013
//
//  Created by Antonio on 02/10/24.
//

import Foundation

// Extension to convert Data into an array of UInt8 (bytes)
extension Data {
    
    public var bytes: Array<UInt8> {
        return Array(self)
    }
    
    /// Encodes data to a base64-url encoded string.
    ///
    /// https://tools.ietf.org/html/rfc4648#page-7
    ///
    /// - parameter options: The options to use for the encoding. Default value is `[]`.
    /// - returns: The base64-url encoded string.
    public func base64URLEncodedString(options: Data.Base64EncodingOptions = []) -> String {
        return base64EncodedString(options: options).base64URLEscaped()
    }
    
    public func decodeJSON<T: Decodable>(type: T.Type = T.self) -> T? {
        let decoder = JSONDecoder()
        guard let response = try? decoder.decode(type.self, from: self) else { return nil }
        return response
    }
}

extension Data {
    public init?(base64UrlEncoded input: String) {
        var base64 = input
        base64 = base64.replacingOccurrences(of: "-", with: "+")
        base64 = base64.replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 {
            base64 = base64.appending("=")
        }
        self.init(base64Encoded: base64)
    }

    public func base64UrlEncodedString() -> String {
        var result = self.base64EncodedString()
        result = result.replacingOccurrences(of: "+", with: "-")
        result = result.replacingOccurrences(of: "/", with: "_")
        result = result.replacingOccurrences(of: "=", with: "")
        return result
    }
    
}

extension Data {
    struct HexEncodingOptions: OptionSet {
        public let rawValue: Int

        public init(rawValue: Int) {
            self.rawValue = rawValue
        }

        public static let upperCase = HexEncodingOptions(rawValue: 1 << 0)
    }

    func hexEncodedString(options: HexEncodingOptions = []) -> String {
        let format = options.contains(.upperCase) ? "%02hhX" : "%02hhx"
        return map { String(format: format, $0) }.joined()
    }

    init?(hex: String) {
        guard !hex.isEmpty else {
            return nil
        }

        guard hex.count.isMultiple(of: 2) else {
            return nil
        }

        let chars = hex.map { $0 }
        let bytes = stride(from: 0, to: chars.count, by: 2)
            .map { String(chars[$0]) + String(chars[$0 + 1]) }
            .compactMap { UInt8($0, radix: 16) }

        guard hex.count / bytes.count == 2 else { return nil }
        self.init(bytes)
    }
}

extension Data {
    func object<T>() -> T { withUnsafeBytes { $0.load(as: T.self) } }
}
