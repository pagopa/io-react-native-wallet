//
//  DocRequest.swift
//  libIso18013
//
//  Created by Antonio on 17/10/24.
//

import Foundation
internal import SwiftCBOR
internal import OrderedCollections

struct DocRequest {
    public let itemsRequest: ItemsRequest
    public let itemsRequestRawData: [UInt8]? // items-request raw data NOT tagged
	/// Used for mdoc reader authentication
    let readerAuth: ReaderAuth?
    public let readerAuthRawCBOR: CBOR?

    enum Keys: String {
        case itemsRequest
        case readerAuth
    }
}

extension DocRequest: CBORDecodable {
    public init?(cbor: CBOR) throws {
        guard case let .map(m) = cbor else { return nil }
        // item-request-bytes: tagged(24, items request)
        guard case let .tagged(_, cirb) = m[Keys.itemsRequest], case let .byteString(bs) = cirb, let ir = try ItemsRequest(data: bs)  else { return nil }
        itemsRequestRawData = bs; itemsRequest = ir
        if let ra = m[Keys.readerAuth] { readerAuthRawCBOR = ra; readerAuth = ReaderAuth(cbor: ra) } else { readerAuthRawCBOR = nil; readerAuth = nil }
    }
}

extension DocRequest: CBOREncodable {
	public func toCBOR(options: CBOROptions) -> CBOR {
        var m = OrderedDictionary<CBOR, CBOR>()
		if let itemsRequestRawData { m[.utf8String(Keys.itemsRequest.rawValue)] = itemsRequestRawData.taggedEncoded }
        else { m[.utf8String(Keys.itemsRequest.rawValue)] = itemsRequest.toCBOR(options: options).taggedEncoded }
        if let readerAuth { m[.utf8String(Keys.readerAuth.rawValue)] = readerAuth.toCBOR(options: options) }
        return .map(m)
    }
}

extension DocRequest {
    public var readerCertificate: Data? {
        guard let ra = readerAuth else { return nil }
        //MARK: FIRST CERTIFICATE SHOULD BE CORRECT BUT IF MULTIPLE CERTS ARE PASSED WE ARE LOOKING FOR LEAF OF CHAIN
        guard let cert = ra.iaca.first else { return nil }
        return Data(cert)
    }
    
    public var readerCertificateChain: [SecCertificate]? {
        guard let ra = readerAuth else { return nil }
        
        let certs = ra.iaca
       
        if (certs.isEmpty) {
            return nil
        }
        
        return certs.compactMap({
            cert in
            print(Data(cert).base64EncodedString())
            return SecCertificateCreateWithData(nil, Data(cert) as CFData)
        })
        
    }
}
