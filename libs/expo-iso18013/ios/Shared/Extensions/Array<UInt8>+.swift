//
//  Array<UInt8>+.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 14/11/25.
//

import Foundation

extension Array<UInt8> {
    
    // Extension to convert an array of UInt8 (bytes) into a Data
    public var data: Data {
        return Data(self)
    }
    
    var hex: String {
        var str = ""
        for byte in self {
            str = str.appendingFormat("%02X", UInt(byte))
        }
        return str
    }
    
    init?(hex: String) {
        guard let data = Data(hex: hex) else {
            return nil
        }
        self.init(data)
    }
    
    var hexEncodedString: String {
        return Data(self).hexEncodedString()
    }
    
    var hexDump: String {
        return HexDump.hexDumpStringForBytes(bytes: self)
    }
    
}
