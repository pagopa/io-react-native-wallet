//
//  Utils.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 14/11/25.
//

import CoreNFC


class Utils {
    static func intToBin(_ data : Int, pad : Int = 2) -> [UInt8] {
        let hexFormat = "%0\(pad)x"
        return [UInt8](hex: String(format: hexFormat, data))!
    }
}
