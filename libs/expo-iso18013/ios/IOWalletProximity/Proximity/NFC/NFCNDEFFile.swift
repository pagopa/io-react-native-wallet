//
//  NFCNDEFFile.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 04/12/25.
//


class NFCNDEFFile {
    var id: String
    private var _value: [UInt8]
    private var _children: [NFCNDEFFile]
    
    var root: NFCNDEFFile?
    
    var children: [NFCNDEFFile] {
        return _children.map({
            child in
            child.root = self
            return child
        })
    }
    
    var value: [UInt8] {
        return _value
    }
    
    init(id: String, value: [UInt8] = [], children: [NFCNDEFFile] = []) {
        self.id = id
        self._value = value
        self._children = children
    }
    
    func addChild(_ child: NFCNDEFFile) {
        _children.append(child)
    }
}
