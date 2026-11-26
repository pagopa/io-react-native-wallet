//
//  APDUResponse.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 14/11/25.
//

import Foundation
import CoreNFC


struct APDUResponse : CustomStringConvertible, CustomDebugStringConvertible {
    var description: String {
        return "[APDU RESPONSE]: \([sw1, sw2].hexEncodedString)\n[APDU RESPONSE DATA]: \(data.hexEncodedString)\n[APDU STATUS]:\(status.description)"
    }
    
    var debugDescription: String {
        return description
    }
    
    private var sw1 : UInt8
    private var sw2 : UInt8
    

    public var data : [UInt8]
    
    public var status: APDUStatus {
        return APDUStatus.from(sw1: sw1, sw2: sw2)
    }
    
    public var isExtended: Bool
    
    public init(data: [UInt8], sw1: UInt8, sw2: UInt8, extended: Bool) {
        self.data = data
        self.sw1 = sw1
        self.sw2 = sw2
        self.isExtended = extended
        
    }
    
    public func copyWith(data: [UInt8]) -> APDUResponse {
        return APDUResponse(data: data, sw1: self.sw1, sw2: self.sw2, extended: self.isExtended)
    }
    
    var raw: [UInt8] {
        if (data.count > 0) {
            return [UInt8](data) + [sw1, sw2]
        }
        return [sw1, sw2]
       
    }
}

extension APDUResponse {
    init(_ apduResponse: (Data, UInt8, UInt8)) {
        self.init(data: [UInt8](apduResponse.0), sw1: apduResponse.1, sw2: apduResponse.2, extended: false)
    }
    
    init(_ data: [UInt8], _ status: APDUStatus, extended: Bool) {
        let (sw1, sw2) = status.to()
        self.init(data: data, sw1: sw1, sw2: sw2, extended: extended)
    }
}
