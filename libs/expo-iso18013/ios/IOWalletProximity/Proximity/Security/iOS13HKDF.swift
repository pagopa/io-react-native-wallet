import CryptoKit
import Foundation

class iOS13HKDF {
    static func deriveKey(inputKeyMaterial: SymmetricKey,
                          salt: [UInt8],
                          info: Data,
                          outputByteCount: Int) -> SymmetricKey {
       return expand(pseudoRandomKey: extract(inputKeyMaterial: inputKeyMaterial, salt: salt), info: info, outputByteCount: outputByteCount)
    }
    
    private static func extract(inputKeyMaterial: SymmetricKey, salt: [UInt8]?) -> HashedAuthenticationCode<SHA256> {
        let key: SymmetricKey
        if let salt = salt {
            if salt.regions.count != 1 {
                let contiguousBytes = Array(salt)
                key = SymmetricKey(data: contiguousBytes)
            } else {
                key = SymmetricKey(data: salt.regions.first!)
            }
        } else {
            key = SymmetricKey(data: [UInt8]())
        }
        
        return inputKeyMaterial.withUnsafeBytes { ikmBytes in
            return HMAC<SHA256>.authenticationCode(for: ikmBytes, using: key)
        }
    }
    
    private static func expand<PRK: ContiguousBytes>(pseudoRandomKey prk: PRK, info: Data?, outputByteCount: Int) -> SymmetricKey {
        let iterations: UInt8 = UInt8(ceil((Float(outputByteCount) / Float(SHA256.self.Digest.byteCount))))
        
        var output = Data()
        let key = SymmetricKey(data: prk)
        var TMinusOne = Data()
        for i in 1...iterations {
            var hmac = HMAC<SHA256>(key: key)
            hmac.update(data: TMinusOne)
            if let info = info {
                hmac.update(data: info)
            }
            
            withUnsafeBytes(of: i) { counter in
                hmac.update(data: counter)
            }
            TMinusOne = Data(hmac.finalize().map({$0}))
            output.append(TMinusOne)
        }
        
        return SymmetricKey(data: output.prefix(outputByteCount))
    }
    
}
