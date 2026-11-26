//
//  APDURequest.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 14/11/25.
//


import CoreNFC
import Foundation


struct APDURequest : CustomStringConvertible, CustomDebugStringConvertible {
    var description: String {
        return raw.hexEncodedString
    }
    
    var debugDescription: String {
        return """
head: \(head.debugDescription)
data: \(data.hexEncodedString)
le: \(le.hexEncodedString)
"""
    }
    
    var head: APDUHead
    var data: [UInt8]
    var le: [UInt8]
    
    var expectedResponseLength: Int? {
        if !le.isEmpty {
            return Int(le.hexEncodedString, radix: 16)
        }
        else {
            return nil
        }
    }
    
    init(head: APDUHead, data: [UInt8] = [], le: [UInt8] = []) {
        self.head = head
        self.data = data
        self.le = le
    }
    
    var raw: [UInt8] {
        
        let lc: [UInt8]
        
        let _le: [UInt8]
        
        if !data.isEmpty {
            if data.count < 0x100 {
                //Lc short length.
                lc = Utils.intToBin(data.count, pad: 4)
                _le = le
            }
            else {
                //Lc extended length.
                //Lc field shall be encoded over three bytes : 00 XX YY
                //This will never be used in code as we prefer command chaining as not all CIE support extended length.
                lc = [
                    UInt8(data.count >> 16),
                    UInt8((data.count >> 8) & 0xFF),
                    UInt8(data.count & 0xFF)
                ]
                
                _le = le
            }
        }
        else {
            //Data field not filled, Lc is not defined.
            lc = []
            _le = le
        }
        
        return head.raw + lc + data + _le
    }
    
    init?(apdu: [UInt8]) {
        guard let apdu = NFCISO7816APDU(data: Data(apdu)) else {
            return nil
        }
        
        self.head = APDUHead(apdu: apdu)
        
        if let data = apdu.data {
            self.data = [UInt8](data)
        }
        else {
            self.data = []
        }
        
        /*
         * -1 means no response data field is expected.
         * Use 256 if you want to send '00' as the short Le field assuming the data field is less than 256 bytes.
         * Use 65536 if you want to send '0000' as the extended Le field.
         */
        
        print(apdu.expectedResponseLength)
        
        if apdu.expectedResponseLength != -1 {
            if apdu.expectedResponseLength < 256 {
                self.le = Utils.intToBin(apdu.expectedResponseLength, pad: 2)
            }
            else if apdu.expectedResponseLength == 256 {
                /**Use 256 if you want to send '00' as the short Le field assuming the data field is less than 256 bytes.**/
                self.le = [0]
            }
            else if apdu.expectedResponseLength > 256 && apdu.expectedResponseLength < 65536 {
                self.le = Utils.intToBin(apdu.expectedResponseLength, pad: 4)
            }
            else {
                /**Use 65536 if you want to send '0000' as the extended Le field.**/
                self.le = [0x00, 0x00]
            }
        } else {
            /**-1 means no response data field is expected.**/
            self.le = []
        }
    }
}
