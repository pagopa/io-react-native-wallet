//
//  IOWalletCBORCoseKey.swift
//  cbor
//
//  Created by Antonio Caparello on 13/02/25.
//

import Foundation

public class IOWalletCBORCoseKey {
    
    internal let coseKey: CoseKey
    
    internal init(_ coseKey: CoseKey) {
        self.coseKey = coseKey
    }
    
    public var crv: ECCurveName {
        return coseKey.crv
    }
    
    public var kty: ECCurveType {
        return coseKey.kty
    }
    
    public var x: [UInt8] {
        return coseKey.x
    }
    
    public var y: [UInt8] {
        return coseKey.y
    }
    
    
}

extension IOWalletCBORCoseKey {
    public convenience init(x: [UInt8], y: [UInt8], crv: ECCurveName = .p256) {
        self.init(CoseKey(x: x, y: y, crv: crv))
    }
    
    public convenience init(crv: ECCurveName, x963Representation: Data) {
        self.init(CoseKey(crv: crv, x963Representation: x963Representation))
    }
    
    public convenience init?(jwk: String) {
        guard let coseKey = CoseKey(jwk: jwk) else {
            return nil
        }
        self.init(coseKey)
    }
    
    public func getx963Representation() -> Data {
        return coseKey.getx963Representation()
    }
    
    public func toJWK() -> String? {
        return coseKey.toJWK()
    }
    
    public convenience init?(data: [UInt8]) {
        guard let coseKey = try? CoseKey(data: data) else {
            return nil
        }
        self.init(coseKey)
    }
}
