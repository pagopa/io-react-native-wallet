//
//  NFCNDEFCard.swift
//  IOWalletProximity
//
//  Created by antoniocaparello on 04/12/25.
//


class NFCNDEFCardFileSystem {
    var root: NFCNDEFFile
    
    init(root: NFCNDEFFile) {
        self.root = root
    }
    
    private var _selected: NFCNDEFFile?
    
    var selectedId: String? {
        return _selected?.id
    }
    
    func select(id: String) -> APDUStatus {
        
        print("selecting \(id)")
        
        let selected = _selected ?? root
        
        let new = selected.children.first(where: {$0.id == id}) ?? selected.root?.children.first(where: {$0.id == id}) ?? root.children.first(where: {$0.id == id})
        
        guard let new = new else {
            return .fileNotFound
        }
        
        _selected = new
        
        return .success
    }
    
    func read(offset: Int, len: Int) -> (APDUStatus, [UInt8]?, Bool) {
        guard let selected = _selected else {
            return (.fileNotFound, nil, true)
        }
        
        print("reading \(offset) to \(offset + len) from \(selected.id)")
        
        let value: ArraySlice<UInt8>
        
        let isLastRead: Bool
        
        if offset + len > selected.value.count {
            value = selected.value[offset..<selected.value.count]
            isLastRead = true
        }
        else {
            value = selected.value[offset..<offset + len]
            isLastRead = offset + len == selected.value.count
        }
        
        return (.success, [UInt8](value), isLastRead)
    }
}
