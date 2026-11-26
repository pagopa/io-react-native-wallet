//
//  ConnectionMethod.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 01/12/25.
//

import Foundation

protocol ConnectionMethod {}


class ConnectionMethodNfc: ConnectionMethod {
    let systemCode: UInt16?
    let nfcid2: Data?
    let payload: Data

    init(systemCode: UInt16?, nfcid2: Data?, payload: Data) {
        self.systemCode = systemCode
        self.nfcid2 = nfcid2
        self.payload = payload
    }
}
