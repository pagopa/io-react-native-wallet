//
//  APDUHead.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 14/11/25.
//

import CoreNFC

struct APDUHead : CustomStringConvertible, CustomDebugStringConvertible {
    var description: String {
        return raw.hexEncodedString
    }
    
    var debugDescription: String {
        return """
CLA: \(String(instructionClass, radix: 16, uppercase: true))
INS: \(String(instruction, radix: 16, uppercase: true))
P1: \(String(p1, radix: 16, uppercase: true))
P2: \(String(p2, radix: 16, uppercase: true))
"""
    }
    
    var instructionClass: UInt8
    var instruction: UInt8
    var p1: UInt8
    var p2: UInt8
    
    init(apdu: NFCISO7816APDU) {
        self.instructionClass = apdu.instructionClass
        self.instruction = apdu.instructionCode
        self.p1 = apdu.p1Parameter
        self.p2 = apdu.p2Parameter
    }
    
    init(instructionClass: UInt8, instruction: UInt8, p1: UInt8, p2: UInt8) {
        self.instructionClass = instructionClass
        self.instruction = instruction
        self.p1 = p1
        self.p2 = p2
    }
    
    var raw: [UInt8] {
        return [
            instructionClass,
            instruction,
            p1,
            p2
        ]
    }
    
    
    
}



enum APDUInstruction : UInt8 {
    case MANAGE_SECURITY_ENVIRONMENT = 0x22
    case READ_BINARY = 0xB0
    case SELECT = 0xA4
    case GET_RESPONSE = 0xC0
    case GET_DATA = 0xCB
    case SIGN = 0x88
    case GET_CHALLENGE = 0x84
    case CHALLENGE_RESPONSE = 0x82
    case VERIFY_CERTIFICATE = 0x2A
    case VERIFY_PIN = 0x20
    
    case GENERAL_AUTHENTICATE = 0x86
    case READ_BINARY1 = 0xB1
    
    case ENVELOPE = 0xC3
    
}
