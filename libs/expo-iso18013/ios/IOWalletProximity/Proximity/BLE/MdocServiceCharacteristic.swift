//
//  MdocServiceCharacteristic.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import CoreBluetooth

public enum MdocServiceCharacteristic: String {
	case state = "00000001-A123-48CE-896B-4C76973373E6"
	case client2Server = "00000002-A123-48CE-896B-4C76973373E6"
	case server2Client = "00000003-A123-48CE-896B-4C76973373E6"
}

extension MdocServiceCharacteristic {
    init?(uuid: CBUUID) {    self.init(rawValue: uuid.uuidString.uppercased()) }
    var uuid: CBUUID { CBUUID(string: rawValue) }
}
